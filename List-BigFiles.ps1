Param(
  [string]$Root = ".",      # repo root
  [int]$MinLines = 400      # line threshold
)

# Count lines efficiently without loading the whole file into memory
function Get-LineCount {
  Param([Parameter(Mandatory)][string]$Path)
  $count = 0
  $reader = [System.IO.StreamReader]::new($Path)
  try {
    while ($null -ne $reader.ReadLine()) { $count++ }
  } finally {
    $reader.Dispose()
  }
  return $count
}

# Gather files, excluding .json and anything under node_modules
$files = Get-ChildItem -Path $Root -File -Recurse -Force -Exclude *.json |
  Where-Object { $_.FullName -notmatch '[\\/]node_modules[\\/]' }

$results = foreach ($f in $files) {
  try {
    $lines = Get-LineCount -Path $f.FullName
    if ($lines -gt $MinLines) {
      [pscustomobject]@{
        Lines = $lines
        Path  = $f.FullName
      }
    }
  } catch {
    # Skip unreadable files quietly
    continue
  }
}

$results | Sort-Object Lines -Descending | ForEach-Object { '{0,6} {1}' -f $_.Lines, $_.Path }
