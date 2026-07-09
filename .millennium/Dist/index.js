const MILLENNIUM_IS_CLIENT_MODULE = true;
const pluginName = "steam-region-buyer";

function InitializePlugins() {
  const pluginList = (window.PLUGIN_LIST ||= {});
  pluginList[pluginName] ||= {};
  window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS ||= {};
}

InitializePlugins();

async function ExecutePluginModule() {
  Object.assign(window.PLUGIN_LIST[pluginName], {
    __millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
  });
  MILLENNIUM_BACKEND_IPC?.postMessage?.(1, { pluginName });
}

ExecutePluginModule();
