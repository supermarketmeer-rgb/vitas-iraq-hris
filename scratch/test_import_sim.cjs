const http = require('http');

const testEmployee1 = {
  fullName: "اختبار استيراد واحد",
  fullNameEn: "Import Test One",
  empCode: "VTS-9901",
  badgeNo: "B-9901",
  dob: "1990-01-01",
  email: "",
  personalEmail: "",
  phone: "07700000001",
  gender: "ذكر",
  maritalStatus: "أعزب",
  nationality: "عراقي",
  contractStartDate: "2024-01-01",
  contractEndDate: "2025-01-01",
  originalStartDate: "2024-01-01",
  department: "قسم الائتمان",
  jobTitle: "محاسب",
  branch: "فرع بغداد",
  basicSalary: 1000000,
  status: "Active"
};

const testEmployee2 = {
  fullName: "اختبار استيراد اثنين",
  fullNameEn: "Import Test Two",
  empCode: "VTS-9902",
  badgeNo: "B-9902",
  dob: "1992-05-05",
  email: "",
  personalEmail: "",
  phone: "07700000002",
  gender: "أنثى",
  maritalStatus: "متأهل",
  nationality: "عراقي",
  contractStartDate: "2024-01-01",
  contractEndDate: "2025-01-01",
  originalStartDate: "2024-01-01",
  department: "قسم الائتمان",
  jobTitle: "محاسب",
  branch: "فرع بغداد",
  basicSalary: 1200000,
  status: "Active"
};

async function sendEmp(empData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(empData);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employees',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Sending Employee 1...");
  const res1 = await sendEmp(testEmployee1);
  console.log("Res 1:", res1);

  console.log("Sending Employee 2...");
  const res2 = await sendEmp(testEmployee2);
  console.log("Res 2:", res2);
}

main().catch(console.error);
