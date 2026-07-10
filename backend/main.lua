local millennium = require("millennium")
local json = require("json")
local http = require("http")
local logger = require("logger")

local REQUEST_TIMEOUT_SECONDS = 5
local REQUEST_BUDGET_SECONDS = 20

local function valid_api_key(value)
    return type(value) == "string" and value:match("^[A-Za-z0-9]+$") ~= nil and #value >= 20 and #value <= 64
end

local function valid_steam_id(value)
    return type(value) == "string" and value:match("^%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d%d$") ~= nil
end

local function valid_account_key(value)
    return type(value) == "string" and value:match("^[a-z0-9_-]+$") ~= nil and #value >= 1 and #value <= 48
end

local function fetch_owned_games(api_key, steam_id)
    local url = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key="
        .. api_key
        .. "&steamid="
        .. steam_id
        .. "&include_appinfo=false&include_played_free_games=true&format=json"

    local response, err = http.get(url, {
        timeout = REQUEST_TIMEOUT_SECONDS,
        follow_redirects = true,
        user_agent = "Steam-Multi-Region-Helper/0.1.2",
    })

    if not response then
        logger:warn("Steam Web API request failed: " .. tostring(err))
        return nil, "request_failed"
    end

    if response.status ~= 200 then
        logger:warn("Steam Web API returned HTTP status: " .. tostring(response.status))
        return nil, "steam_web_api_error"
    end

    local body = response.body or ""
    if body == "" then
        return nil, "empty_response"
    end

    if not body:match("^%s*{") then
        logger:warn("Steam Web API returned a non-JSON response")
        return nil, "steam_web_api_error"
    end

    return body, nil
end

function GetOwnedGames(request)
    local decoded = json.decode(request or "{}")
    if not decoded then
        return json.encode({ status = "error", message = "bad_request" })
    end

    local api_key = tostring(decoded.apiKey or "")
    if not valid_api_key(api_key) then
        return json.encode({ status = "error", message = "invalid_api_key" })
    end

    local accounts = decoded.accounts or {}
    local results = {}
    local started_at = os.time()

    for _, account in ipairs(accounts) do
        local account_key = tostring(account.accountKey or account.regionKey or "")
        local steam_id = tostring(account.steamId or "")

        if valid_account_key(account_key) and valid_steam_id(steam_id) then
            if os.difftime(os.time(), started_at) >= REQUEST_BUDGET_SECONDS then
                results[account_key] = { status = "error", message = "request_budget_exhausted" }
            else
                local body, err = fetch_owned_games(api_key, steam_id)
                if body then
                    results[account_key] = { status = "ok", body = body }
                else
                    results[account_key] = { status = "error", message = err or "request_failed" }
                end
            end
        elseif valid_account_key(account_key) then
            results[account_key] = { status = "error", message = "invalid_steamid" }
        end
    end

    return json.encode({ status = "ok", results = results })
end

function on_load()
    logger:info("Steam Multi-Region Helper loaded in Millennium version: " .. millennium.version())
    millennium.ready()
end

function on_unload()
    logger:info("Steam Multi-Region Helper unloaded")
end

return {
    on_load = on_load,
    on_unload = on_unload,
}
