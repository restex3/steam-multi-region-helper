local millennium = require("millennium")
local json = require("json")
local utils = require("utils")
local logger = require("logger")

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

    local command = 'curl.exe -L --silent --show-error --max-time 25 "' .. url .. '"'
    local output, status = utils.exec(command)

    if not output or output == "" then
        return nil, "empty_response"
    end

    if not output:match("^%s*{") then
        logger:warn("Steam Web API returned a non-JSON response. curl status: " .. tostring(status))
        return nil, "steam_web_api_error"
    end

    return output, nil
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

    for _, account in ipairs(accounts) do
        local account_key = tostring(account.accountKey or account.regionKey or "")
        local steam_id = tostring(account.steamId or "")

        if valid_account_key(account_key) and valid_steam_id(steam_id) then
            local body, err = fetch_owned_games(api_key, steam_id)
            if body then
                results[account_key] = { status = "ok", body = body }
            else
                results[account_key] = { status = "error", message = err or "request_failed" }
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
