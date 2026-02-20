import Link from 'next/link'
export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>GotGas</h1>
      <p>Frontend is running!</p>
      <Link href="/login">
        <button style={{ 
          padding: '10px 20px',
          marginTop: '20px',
          backgroundColor: '#054425',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer', 
          fontSize: '16px' }}>
          Go to Login
          </button>
      </Link>
    </div>
  )
}
