$folder = 'src\tax_module\components'
$files = Get-ChildItem -Path $folder -Include '*.tsx','*.ts' -Recurse
$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content
    
    # Replace backtick patterns: fetch(`/api/X  =>  fetch(`/api/tax-module/X
    # But skip ones already containing /api/tax-module
    $newContent = [regex]::Replace($newContent, "fetch\(`/api/(?!tax-module)", "fetch(`/api/tax-module/")

    if ($newContent -ne $content) {
        Set-Content $file.FullName $newContent -NoNewline
        Write-Host "Updated: $($file.Name)"
        $count++
    }
}
Write-Host "Total files updated: $count"
