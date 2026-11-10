use rcgen::{CertificateParams, DistinguishedName, DnType, KeyPair, SanType};
use std::net::IpAddr;

pub fn generate_self_signed_cert(
    local_ip: IpAddr,
    all_lan_ips: &[IpAddr],
) -> Result<(Vec<u8>, Vec<u8>), Box<dyn std::error::Error + Send + Sync>> {
    let mut params = CertificateParams::default();
    let mut dn = DistinguishedName::new();
    dn.push(DnType::CommonName, "PhoneCam");
    dn.push(DnType::OrganizationName, "PhoneCam");
    params.distinguished_name = dn;

    let mut sans = vec![
        SanType::DnsName("localhost".to_string().try_into()?),
        SanType::IpAddress(IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))),
        SanType::IpAddress(local_ip),
    ];

    for ip in all_lan_ips {
        if *ip != local_ip {
            sans.push(SanType::IpAddress(*ip));
        }
    }

    params.subject_alt_names = sans;

    let key_pair = KeyPair::generate()?;
    let cert = params.self_signed(&key_pair)?;

    let cert_pem = cert.pem().into_bytes();
    let key_pem = key_pair.serialize_pem().into_bytes();

    Ok((cert_pem, key_pem))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_self_signed_cert() {
        let ip = IpAddr::V4(std::net::Ipv4Addr::new(192, 168, 0, 2));
        let (cert, key) = generate_self_signed_cert(ip, &[]).expect("certificate generation failed");
        let cert_str = String::from_utf8(cert).expect("invalid cert utf-8");
        let key_str = String::from_utf8(key).expect("invalid key utf-8");

        assert!(cert_str.contains("BEGIN CERTIFICATE"));
        assert!(key_str.contains("BEGIN PRIVATE KEY"));
    }
}
