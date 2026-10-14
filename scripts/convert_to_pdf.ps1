try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $inPath = (Resolve-Path "report\CloudRDR_Yekun_Report.docx").Path
    $outPath = [System.IO.Path]::ChangeExtension($inPath, ".pdf")
    $doc = $word.Documents.Open($inPath)
    $wdFormatPDF = 17
    $doc.SaveAs([ref]$outPath, [ref]$wdFormatPDF)
    $doc.Close()
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Output "PDF generated: $outPath"
} catch {
    Write-Output "Word COM not available or error: $($_.Exception.Message)"
}
