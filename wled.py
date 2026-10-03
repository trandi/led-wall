import socket

class WLEDDriver:
    def __init__(self, ip, port=4048):
        self.ip = ip
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
    def send(self, pixel_data):
        total_len = len(pixel_data)
        bytes_sent = 0
        while bytes_sent < total_len:
            chunk_len = min(total_len - bytes_sent, 1440)
            flags = 0x41 if (bytes_sent + chunk_len >= total_len) else 0x01
            header = bytearray([flags, 1, 1, 0, (bytes_sent>>24)&0xFF, (bytes_sent>>16)&0xFF, (bytes_sent>>8)&0xFF, bytes_sent&0xFF, (chunk_len>>8)&0xFF, chunk_len&0xFF])
            packet = header + pixel_data[bytes_sent:bytes_sent+chunk_len]
            self.sock.sendto(packet, (self.ip, self.port))
            bytes_sent += chunk_len
