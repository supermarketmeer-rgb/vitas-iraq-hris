const http = require('http');

const profileData = {
  id: 'COMP-001',
  company_name: 'شركة فيتاس العراق',
  company_name_en: 'Vitas Iraq',
  logo_url: '',
  address: 'بغداد، العراق',
  city: 'بغداد',
  country: 'العراق',
  phone: '+964 780 000 0000',
  email: 'info@vitasiraq.com',
  website: 'https://vitasiraq.com',
  tax_id: '',
  registration_number: '',
  established_date: '1899-11-29T21:02:24.000Z',
  description: 'شركة فيتاس العراق للخدمات المتكاملة',
  updated_at: new Date().toISOString()
};

const postData = JSON.stringify(profileData);

const req = http.request('http://localhost:5000/api/company-profile/COMP-001', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('PUT company-profile response:', data);
  });
});

req.on('error', (err) => {
  console.error('Error PUTting to API:', err.message);
});

req.write(postData);
req.end();
