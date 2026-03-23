$ErrorActionPreference = 'Stop'

$baseUrl = 'http://localhost:5001'
$studentEmail = 'bennettchristiangeofferdon15@gmail.com'
$studentPassword = 'Password123!'
$documentTypes = @('chapter_1', 'chapter_2', 'chapter_3', 'proposal')

function Add-Result {
    param(
        [System.Collections.Generic.List[object]]$Results,
        [string]$Name,
        [bool]$Pass,
        [string]$Detail
    )

    $Results.Add([PSCustomObject]@{
        Name = $Name
        Pass = $Pass
        Detail = $Detail
    }) | Out-Null
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Uri,
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        $Body = $null
    )

    try {
        if ($null -ne $Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 8
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -WebSession $Session -ContentType 'application/json' -Body $jsonBody
        } else {
            $resp = Invoke-RestMethod -Method $Method -Uri $Uri -WebSession $Session
        }

        return [PSCustomObject]@{
            Ok = $true
            Status = 200
            Json = $resp
            ErrorCode = $null
            ErrorMessage = $null
        }
    }
    catch {
        $statusCode = 0
        $errorBody = $null

        if ($_.Exception.Response) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode
            } catch {
                $statusCode = 0
            }

            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $raw = $reader.ReadToEnd()
                if ($raw) {
                    $errorBody = $raw | ConvertFrom-Json
                }
            } catch {
                $errorBody = $null
            }
        }

        return [PSCustomObject]@{
            Ok = $false
            Status = $statusCode
            Json = $errorBody
            ErrorCode = $errorBody.error.code
            ErrorMessage = $errorBody.error.message
        }
    }
}

$results = New-Object System.Collections.Generic.List[object]
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1) Login
$loginPayload = @{ email = $studentEmail; password = $studentPassword }
$loginRes = Invoke-Api -Method 'POST' -Uri "$baseUrl/api/auth/login" -Session $session -Body $loginPayload
Add-Result -Results $results -Name 'A1 Student login' -Pass $loginRes.Ok -Detail "status=$($loginRes.Status)"

if (-not $loginRes.Ok) {
    Add-Result -Results $results -Name 'A2 Abort on auth failure' -Pass $false -Detail ($loginRes.ErrorMessage ?? 'Login failed')
}
else {
    # 2) Project context
    $meRes = Invoke-Api -Method 'GET' -Uri "$baseUrl/api/projects/me" -Session $session
    $projectId = $meRes.Json.data.project._id
    Add-Result -Results $results -Name 'A2 Resolve student project' -Pass ($meRes.Ok -and [string]::IsNullOrWhiteSpace($projectId) -eq $false) -Detail "status=$($meRes.Status) projectId=$projectId"

    if (-not $projectId) {
        Add-Result -Results $results -Name 'A3 Abort (no project)' -Pass $false -Detail 'No student project found'
    }
    else {
        # 3) Existing manuscripts
        $listRes = Invoke-Api -Method 'GET' -Uri "$baseUrl/api/documents/projects/$projectId/manuscripts" -Session $session
        $existing = @()
        if ($listRes.Ok -and $listRes.Json.data.manuscripts) {
            $existing = @($listRes.Json.data.manuscripts)
        }

        Add-Result -Results $results -Name 'A3 List manuscripts' -Pass $listRes.Ok -Detail "status=$($listRes.Status) count=$($existing.Count)"

        $usedTypes = @{}
        foreach ($m in $existing) {
            $usedTypes[$m.documentType] = $true
        }

        $availableType = $null
        foreach ($t in $documentTypes) {
            if (-not $usedTypes.ContainsKey($t)) {
                $availableType = $t
                break
            }
        }

        Add-Result -Results $results -Name 'A4 Find available type' -Pass ($null -ne $availableType) -Detail "documentType=$availableType"

        if ($null -ne $availableType) {
            # 4) Valid upload (google_docs) with retry over candidate document types
            $candidateTypesForValid = @()
            foreach ($t in $documentTypes) {
                if (-not $usedTypes.ContainsKey($t)) {
                    $candidateTypesForValid += $t
                }
            }

            $validRes = $null
            $created = $null
            $validUploadType = $null

            foreach ($candidate in $candidateTypesForValid) {
                $candidatePayload = @{
                    documentType = $candidate
                    title = "E2E Link Test $(Get-Date -Format o)"
                    externalDocUrl = 'https://docs.google.com/document/d/1WK8zm0XFVvYCq4VWBfGzq82Y_nPUZ58ufXnPYsWVat4/edit'
                    externalDocProvider = 'google_docs'
                }

                $candidateRes = Invoke-Api -Method 'POST' -Uri "$baseUrl/api/documents/projects/$projectId/manuscripts" -Session $session -Body $candidatePayload

                if ($candidateRes.Ok) {
                    $validRes = $candidateRes
                    $created = $candidateRes.Json.data.manuscript
                    $validUploadType = $candidate
                    break
                }

                if ($candidateRes.Status -ne 409) {
                    $validRes = $candidateRes
                    $validUploadType = $candidate
                    break
                }
            }

            Add-Result -Results $results -Name 'B1 Upload valid link' -Pass ($validRes -and $validRes.Ok -and $created) -Detail "status=$($validRes.Status) documentType=$validUploadType"
            Add-Result -Results $results -Name 'B2 externalDocUrl persisted' -Pass ($created.externalDocUrl -eq 'https://docs.google.com/document/d/1WK8zm0XFVvYCq4VWBfGzq82Y_nPUZ58ufXnPYsWVat4/edit') -Detail "stored=$($created.externalDocUrl)"
            Add-Result -Results $results -Name 'B3 externalDocProvider persisted' -Pass ($created.externalDocProvider -eq 'google_docs') -Detail "provider=$($created.externalDocProvider)"

            # 5) Invalid URL validation
            $badPayload = @{
                documentType = ($validUploadType ?? $availableType)
                title = 'Invalid URL should fail'
                externalDocUrl = 'not-a-valid-url'
                externalDocProvider = 'google_docs'
            }
            $badRes = Invoke-Api -Method 'POST' -Uri "$baseUrl/api/documents/projects/$projectId/manuscripts" -Session $session -Body $badPayload
            Add-Result -Results $results -Name 'C1 Reject invalid URL' -Pass ($badRes.Status -eq 400) -Detail "status=$($badRes.Status) code=$($badRes.ErrorCode)"

            # 6) Provider=other (retry through remaining document types if one conflicts)
            $candidateTypes = @()
            foreach ($t in $documentTypes) {
                if ($t -ne $availableType) {
                    $candidateTypes += $t
                }
            }

            $otherRes = $null
            $otherCreated = $null
            $usedOtherType = $null

            foreach ($candidate in $candidateTypes) {
                $candidatePayload = @{
                    documentType = $candidate
                    title = "E2E Other Provider $(Get-Date -Format o)"
                    externalDocUrl = 'https://example.com/cms-e2e-document'
                    externalDocProvider = 'other'
                }

                $candidateRes = Invoke-Api -Method 'POST' -Uri "$baseUrl/api/documents/projects/$projectId/manuscripts" -Session $session -Body $candidatePayload

                if ($candidateRes.Ok) {
                    $otherRes = $candidateRes
                    $otherCreated = $candidateRes.Json.data.manuscript
                    $usedOtherType = $candidate
                    break
                }

                if ($candidateRes.Status -ne 409) {
                    $otherRes = $candidateRes
                    $usedOtherType = $candidate
                    break
                }
            }

            if ($otherRes -and $otherRes.Ok) {
                Add-Result -Results $results -Name 'D1 Upload provider=other' -Pass $true -Detail "status=$($otherRes.Status) documentType=$usedOtherType"
                Add-Result -Results $results -Name 'D2 provider other persisted' -Pass ($otherCreated.externalDocProvider -eq 'other') -Detail "provider=$($otherCreated.externalDocProvider)"
            } elseif ($otherRes) {
                Add-Result -Results $results -Name 'D1 Upload provider=other' -Pass $false -Detail "status=$($otherRes.Status) documentType=$usedOtherType"
                Add-Result -Results $results -Name 'D2 provider other persisted' -Pass $false -Detail 'Provider assertion skipped due to failed upload'
            } else {
                Add-Result -Results $results -Name 'D1 Upload provider=other' -Pass $false -Detail 'Skipped: no candidate types available'
                Add-Result -Results $results -Name 'D2 provider other persisted' -Pass $false -Detail 'Skipped: no candidate types available'
            }

            # 7) Open-link retrieval
            $openLinkType = $validUploadType
            if (-not $openLinkType -and $existing.Count -gt 0) {
                $openLinkType = $existing[0].documentType
            }
            if (-not $openLinkType) {
                $openLinkType = $availableType
            }

            $openRes = Invoke-Api -Method 'GET' -Uri "$baseUrl/api/documents/projects/$projectId/manuscripts/$openLinkType/open-link" -Session $session
            Add-Result -Results $results -Name 'E1 open-link endpoint' -Pass $openRes.Ok -Detail "status=$($openRes.Status)"
            Add-Result -Results $results -Name 'E2 open-link value present' -Pass ([string]::IsNullOrWhiteSpace($openRes.Json.data.openLink) -eq $false) -Detail "openLink=$($openRes.Json.data.openLink)"
        }
    }
}

Write-Host '=== DOCUMENT LINK E2E TEST MATRIX ==='
foreach ($r in $results) {
    $status = if ($r.Pass) { 'PASS' } else { 'FAIL' }
    Write-Host "$status | $($r.Name) | $($r.Detail)"
}

$passCount = ($results | Where-Object { $_.Pass }).Count
$total = $results.Count
$failCount = $total - $passCount
Write-Host "SUMMARY pass=$passCount fail=$failCount total=$total"

if ($failCount -gt 0) {
    exit 2
}

exit 0
