use local_ip_address::list_afinet_netifas;
use std::net::{IpAddr, Ipv4Addr};

pub fn is_lan_ip(ipv4: &Ipv4Addr) -> bool {
    let octets = ipv4.octets();
    if octets[0] == 169 && octets[1] == 254 {
        return false;
    }
    if ipv4.is_loopback() {
        return false;
    }
    if octets[0] == 192 && octets[1] == 168 {
        return true;
    }
    if octets[0] == 10 {
        return true;
    }
    if octets[0] == 172 && (16..=31).contains(&octets[1]) {
        return true;
    }
    false
}

pub fn detect_all_lan_ips() -> Vec<IpAddr> {
    let mut ips = Vec::new();
    if let Ok(interfaces) = list_afinet_netifas() {
        for (_name, ip) in interfaces {
            if let IpAddr::V4(ipv4) = ip {
                if is_lan_ip(&ipv4) && !ips.contains(&ip) {
                    ips.push(ip);
                }
            }
        }
    }
    ips
}

pub fn detect_local_ip() -> IpAddr {
    let all_ips = detect_all_lan_ips();

    for ip in &all_ips {
        if let IpAddr::V4(ipv4) = ip {
            let octets = ipv4.octets();
            if octets[0] == 192 && octets[1] == 168 {
                return *ip;
            }
        }
    }

    for ip in &all_ips {
        if let IpAddr::V4(ipv4) = ip {
            let octets = ipv4.octets();
            if octets[0] == 10 {
                return *ip;
            }
        }
    }

    for ip in &all_ips {
        if let IpAddr::V4(ipv4) = ip {
            let octets = ipv4.octets();
            if octets[0] == 172 && (16..=31).contains(&octets[1]) {
                return *ip;
            }
        }
    }

    IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_local_ip() {
        let ip = detect_local_ip();
        println!("DETECTED_LAN_IP: {}", ip);
        if let IpAddr::V4(ipv4) = ip {
            let octets = ipv4.octets();
            assert_ne!(octets[0], 26);
            assert_ne!(octets[0], 169);
            assert_eq!(octets[0], 192);
            assert_eq!(octets[1], 168);
        }
    }
}
