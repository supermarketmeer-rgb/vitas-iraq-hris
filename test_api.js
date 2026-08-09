import fetch from 'node-fetch';

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/employees');
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();