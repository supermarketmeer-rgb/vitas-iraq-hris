const http = require('http');

const settingsObj = {
  basic_salary_min: '500000',
  basic_salary_max: '5000000',
  housing_allowance_percent: '15',
  housing_allowance_default: '750000',
  transportation_allowance_default: '250000',
  food_allowance_default: '150000',
  child_allowance_default: '25000',
  annual_leave_balance: '20',
  max_sick_leave: '15',
  maternity_leave_limit: '70',
  emergency_leave_limit: '7',
  social_security_company_share: '12',
  social_security_employee_share: '5',
  insurance_company_share: '25000',
  official_work_hours_start: '08:00',
  official_work_hours_end: '16:00',
  thursday_work_hours_start: '08:00',
  thursday_work_hours_end: '14:00',
  weekend_friday: 'true',
  weekend_saturday: 'true'
};

const postData = JSON.stringify(settingsObj);

const req = http.request('http://localhost:5000/api/settings/app/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Bulk save status code:', res.statusCode);
    console.log('Bulk save data:', data);
  });
});

req.on('error', err => console.error(err));
req.write(postData);
req.end();
