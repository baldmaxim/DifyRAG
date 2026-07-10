param(
    [Parameter(Mandatory = $true)]
    [string]$Command
)

$envFile = (Resolve-Path (Join-Path $PSScriptRoot '..' | Join-Path -ChildPath '.env')).Path
$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $vars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser -AllowClobber
}

$sec = ConvertTo-SecureString $vars['SSH_PASSWORD'] -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($vars['SSH_USER'], $sec)
$session = New-SSHSession -ComputerName $vars['SSH_IP'] -Port ([int]$vars['SSH_PORT']) -Credential $cred -AcceptKey
try {
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $Command
    if ($result.Output) { $result.Output | ForEach-Object { Write-Output $_ } }
    if ($result.Error) { $result.Error | ForEach-Object { Write-Error $_ } }
    exit $result.ExitStatus
} finally {
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
}
