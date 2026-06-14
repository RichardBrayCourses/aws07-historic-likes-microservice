$ErrorActionPreference = "Stop"

if (-not $IsWindows -and $PSVersionTable.PSEdition -eq "Core") {
    Write-Error "This script is designed for Windows only."
    exit 1
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Error "winget is required. Install App Installer from the Microsoft Store and run this script again."
    exit 1
}

$packages = @(
    @{
        Name = "Flyway"
        IdCandidates = @(
            "Redgate.Flyway",
            "RedGate.Flyway",
            "Redgate.FlywayDesktop",
            "RedGate.FlywayDesktop"
        )
    },
    @{
        Name = "pgAdmin"
        IdCandidates = @("PostgreSQL.pgAdmin")
    }
)

foreach ($package in $packages) {
    $installed = $false

    foreach ($id in $package.IdCandidates) {
        Write-Host "Checking for $($package.Name) winget package ID: $id"
        winget show --exact --id $id --accept-source-agreements | Out-Null

        if ($LASTEXITCODE -ne 0) {
            continue
        }

        Write-Host "Installing $($package.Name) with package ID: $id"
        winget install --exact --id $id --accept-source-agreements --accept-package-agreements

        if ($LASTEXITCODE -eq 0) {
            $installed = $true
            break
        }
    }

    if (-not $installed) {
        Write-Error "Could not install $($package.Name) with the configured winget package IDs. Run 'winget search $($package.Name)' to confirm the current package ID."
        exit 1
    }
}

Write-Host "Flyway and pgAdmin installation complete."
