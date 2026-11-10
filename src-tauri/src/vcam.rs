use std::sync::Mutex;
use virtualcam::backend::BackendKind;
use virtualcam::{Camera, PixelFormat};

pub struct VirtualCameraManager {
    camera: Mutex<Option<Camera>>,
    width: Mutex<u32>,
    height: Mutex<u32>,
    nv12_buffer: Mutex<Vec<u8>>,
}

impl VirtualCameraManager {
    pub fn new() -> Self {
        Self {
            camera: Mutex::new(None),
            width: Mutex::new(1280),
            height: Mutex::new(720),
            nv12_buffer: Mutex::new(Vec::new()),
        }
    }

    pub fn start(&self, width: u32, height: u32) -> Result<(), String> {
        let mut cam_guard = self.camera.lock().map_err(|e| e.to_string())?;

        let cam = Camera::builder(width, height, 30.0)
            .backend(BackendKind::Obs)
            .format(PixelFormat::NV12)
            .build()
            .map_err(|e| e.to_string())?;

        *cam_guard = Some(cam);

        if let Ok(mut w) = self.width.lock() {
            *w = width;
        }
        if let Ok(mut h) = self.height.lock() {
            *h = height;
        }
        if let Ok(mut buf) = self.nv12_buffer.lock() {
            let required_size = (width * height * 3 / 2) as usize;
            buf.resize(required_size, 0);
        }

        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut cam_guard = self.camera.lock().map_err(|e| e.to_string())?;
        *cam_guard = None;
        Ok(())
    }

    pub fn send_frame(&self, frame: &[u8]) -> Result<(), String> {
        let mut cam_guard = self.camera.lock().map_err(|e| e.to_string())?;
        if let Some(cam) = cam_guard.as_mut() {
            let w = self.width.lock().map(|v| *v).unwrap_or(1280) as usize;
            let h = self.height.lock().map(|v| *v).unwrap_or(720) as usize;
            let nv12_expected = w * h * 3 / 2;

            if frame.len() == nv12_expected {
                cam.send_native(frame).map_err(|e| e.to_string())?;
            } else if frame.len() == w * h * 4 {
                let mut buf_guard = self.nv12_buffer.lock().map_err(|e| e.to_string())?;
                if buf_guard.len() != nv12_expected {
                    buf_guard.resize(nv12_expected, 0);
                }
                fast_rgba_to_nv12(frame, w, h, &mut buf_guard);
                cam.send_native(&buf_guard).map_err(|e| e.to_string())?;
            } else {
                return Err(format!("Invalid frame size: expected {} (NV12) or {} (RGBA), got {}", nv12_expected, w * h * 4, frame.len()));
            }
        }
        Ok(())
    }

    pub fn is_active(&self) -> bool {
        if let Ok(guard) = self.camera.lock() {
            guard.is_some()
        } else {
            false
        }
    }
}

fn fast_rgba_to_nv12(src: &[u8], width: usize, height: usize, dst: &mut [u8]) {
    let y_size = width * height;
    let (y_plane, uv_plane) = dst.split_at_mut(y_size);

    for y in 0..height {
        let row_offset = y * width;
        for x in 0..width {
            let idx = (row_offset + x) * 4;
            let r = src[idx] as i32;
            let g = src[idx + 1] as i32;
            let b = src[idx + 2] as i32;

            let yy = ((66 * r + 129 * g + 25 * b + 128) >> 8) + 16;
            y_plane[row_offset + x] = yy.clamp(0, 255) as u8;

            if (x & 1) == 0 && (y & 1) == 0 {
                let u = ((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128;
                let v = ((112 * r - 94 * g - 18 * b + 128) >> 8) + 128;
                let uv_idx = (y >> 1) * width + x;
                uv_plane[uv_idx] = u.clamp(0, 255) as u8;
                uv_plane[uv_idx + 1] = v.clamp(0, 255) as u8;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vcam_manager_lifecycle() {
        let manager = VirtualCameraManager::new();
        assert!(!manager.is_active());
    }

    #[test]
    fn test_inspect_backends() {
        let backends = available_backends();
        for b in &backends {
            println!("BACKEND_AVAILABLE: name = {}, default_dev = {}, native_fmt = {}", b.name, b.default_device, b.native_format);
        }

        let mut cam = Camera::builder(1280, 720, 30.0)
            .backend(BackendKind::Obs)
            .format(PixelFormat::NV12)
            .build()
            .unwrap();

        let nv12_frame = vec![128u8; 1280 * 720 * 3 / 2];
        let _start_nv12 = std::time::Instant::now();
        cam.send_native(&nv12_frame).unwrap();
        drop(cam);

        let manager = VirtualCameraManager::new();
        manager.start(1280, 720).unwrap();
        let start_mgr_nv12 = std::time::Instant::now();
        manager.send_frame(&nv12_frame).unwrap();
        println!("MGR_SEND_NV12_TIME: {:?}", start_mgr_nv12.elapsed());

        let rgba_frame = vec![128u8; 1280 * 720 * 4];
        let start_mgr_rgba = std::time::Instant::now();
        manager.send_frame(&rgba_frame).unwrap();
        println!("MGR_SEND_RGBA_TIME: {:?}", start_mgr_rgba.elapsed());
    }
}
