export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>GotGas</h1>
      <p>Frontend is running!</p>
      <div style={{ marginTop: '20px', width: '100%', height: '450px' }}>
        <iframe
          title="GotGas Map"
          src="https://www.google.com/maps?q=gas+station&output=embed"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  )
}