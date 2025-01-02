/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/chat-widget',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000"
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM http://localhost:3000'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 