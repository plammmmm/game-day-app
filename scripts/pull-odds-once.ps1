# One-time NFL odds pull -> CSV. Validates the Odds API key and data shape.
# Cost: 3 credits (h2h + spreads + totals, US region).
# Run from PowerShell:  powershell -ExecutionPolicy Bypass -File .\scripts\pull-odds-once.ps1
# Your key is asked for at runtime and never saved.

param(
  [string]$Sport = "americanfootball_nfl",
  [string]$Out   = "nfl_odds.csv"
)
$ErrorActionPreference = "Stop"

$key = $env:ODDS_API_KEY
if (-not $key) {
  $sec = Read-Host "Paste your Odds API key" -AsSecureString
  $key = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

$url = "https://api.the-odds-api.com/v4/sports/$Sport/odds" +
       "?apiKey=$key&regions=us&markets=h2h,spreads,totals&oddsFormat=american"

try {
  $resp = Invoke-WebRequest -Uri $url -UseBasicParsing
} catch {
  Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Check the key is correct and has credits left." -ForegroundColor Red
  exit 1
}

$events  = $resp.Content | ConvertFrom-Json
$central = [System.TimeZoneInfo]::FindSystemTimeZoneById("Central Standard Time")
$pulled  = (Get-Date).ToString("yyyy-MM-dd HH:mm")

$rows = foreach ($e in $events) {
  $kickUtc = [DateTime]::Parse($e.commence_time).ToUniversalTime()
  $kickCt  = [System.TimeZoneInfo]::ConvertTimeFromUtc($kickUtc, $central).ToString("yyyy-MM-dd HH:mm")
  foreach ($b in $e.bookmakers) {
    foreach ($m in $b.markets) {
      foreach ($o in $m.outcomes) {
        [PSCustomObject]@{
          pulled_at_ct = $pulled
          game_id      = $e.id
          kickoff_ct   = $kickCt
          away         = $e.away_team
          home         = $e.home_team
          book         = $b.key
          market       = $m.key          # h2h = moneyline
          outcome      = $o.name         # team name, or Over/Under
          point        = $o.point        # spread or total; blank for moneyline
          price        = $o.price        # American odds
          book_updated = $b.last_update
        }
      }
    }
  }
}

$rows | Export-Csv -Path $Out -NoTypeInformation -Encoding UTF8

$games = ($rows | Select-Object -ExpandProperty game_id -Unique).Count
$books = ($rows | Select-Object -ExpandProperty book -Unique) -join ", "
Write-Host ""
Write-Host "Saved $($rows.Count) rows to $Out" -ForegroundColor Green
Write-Host "Games: $games"
Write-Host "Books: $books"
Write-Host "Credits used this call: $($resp.Headers['x-requests-last'])"
Write-Host "Credits remaining this month: $($resp.Headers['x-requests-remaining'])"
