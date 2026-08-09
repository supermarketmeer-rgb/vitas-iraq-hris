$body = ConvertTo-Json @{basic_salary=1500000; marital_status="MARRIED"; dependents_count=2; allowances=@{housing=500000; transport=200000}}
$result = Invoke-RestMethod http://localhost:5000/api/tax-module/simulate -Method POST -ContentType "application/json" -Body $body
$result | ConvertTo-Json -Depth 5
