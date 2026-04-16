$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$phpFiles = Get-ChildItem -Path $root -Recurse -File -Include *.php,*.inc.php |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" }
$jsFiles = Get-ChildItem -Path $root -Recurse -File -Include *.js |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" }

$keys = New-Object System.Collections.Generic.List[string]

foreach ($f in $phpFiles) {
  $txt = Get-Content -Raw -Path $f.FullName

  [regex]::Matches($txt, "clienttranslate\(\s*'((?:\\'|[^'])*)'\s*\)") |
    ForEach-Object {
      $keys.Add(($_.Groups[1].Value -replace "\\'", "'"))
    }

  [regex]::Matches($txt, 'clienttranslate\(\s*"((?:\\"|[^"])*)"\s*\)') |
    ForEach-Object {
      $keys.Add(($_.Groups[1].Value -replace '\\"', '"'))
    }
}

foreach ($f in $jsFiles) {
  $txt = Get-Content -Raw -Path $f.FullName

  [regex]::Matches($txt, "_\(\s*'((?:\\'|[^'])*)'\s*\)") |
    ForEach-Object {
      $keys.Add(($_.Groups[1].Value -replace "\\'", "'"))
    }

  [regex]::Matches($txt, '_\(\s*"((?:\\"|[^"])*)"\s*\)') |
    ForEach-Object {
      $keys.Add(($_.Groups[1].Value -replace '\\"', '"'))
    }
}

$uniq = $keys |
  Where-Object { $_ -and $_.Trim().Length -gt 0 } |
  Sort-Object -Unique

$allOut = Join-Path $PSScriptRoot "i18n_keys_all.txt"
$fragOut = Join-Path $PSScriptRoot "i18n_keys_fragments.txt"

Set-Content -Path $allOut -Value $uniq

$fragmentPrefixRegex = '^(and|or|but|for|to|from|of|in|on|with|without|before|after|while|waiting|resolves|rounds|attacks|defense|believer\(s\)|draw)\b'
$fragments = $uniq | Where-Object {
  $key = $_
  $wordCount = (($key -split '\s+') | Where-Object { $_ -ne '' }).Count
  $looksLikeConnectorFragment = ($key -match $fragmentPrefixRegex) -and ($wordCount -le 4)
  $key -match '^\s' -or
  $key -match '\s$' -or
  $key -match '^[,.;:!?)]' -or
  $looksLikeConnectorFragment
}
Set-Content -Path $fragOut -Value ($fragments | Sort-Object -Unique)

Write-Output ("All keys: " + $uniq.Count)
Write-Output ("Fragment-like keys: " + $fragments.Count)
Write-Output ("Output: " + $allOut)
Write-Output ("Output: " + $fragOut)
