#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ServiceManagement/ServiceManagement.h>
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <vector>

// Stable Node-API C ABI. No V8 / Electron version-specific headers are needed.
extern "C" {
typedef struct napi_env__* napi_env;
typedef struct napi_value__* napi_value;
typedef struct napi_callback_info__* napi_callback_info;
typedef napi_value (*napi_callback)(napi_env, napi_callback_info);
int napi_get_cb_info(napi_env, napi_callback_info, size_t*, napi_value*, napi_value*, void**);
int napi_get_buffer_info(napi_env, napi_value, void**, size_t*);
int napi_get_value_bool(napi_env, napi_value, bool*);
int napi_get_value_string_utf8(napi_env,napi_value,char*,size_t,size_t*);
int napi_create_function(napi_env, const char*, size_t, napi_callback, void*, napi_value*);
int napi_set_named_property(napi_env, napi_value, const char*, napi_value);
int napi_get_undefined(napi_env, napi_value*);
int napi_throw_error(napi_env, const char*, const char*);

static napi_value moveExclusive(napi_env env,napi_callback_info info){
  size_t argc=2,lengths[2]={0,0};napi_value args[2],result;
  if(napi_get_cb_info(env,info,&argc,args,nullptr,nullptr)!=0||argc!=2){napi_throw_error(env,"EINVAL","Expected source and destination paths");return nullptr;}
  std::vector<char> paths[2];
  for(int i=0;i<2;i++){
    if(napi_get_value_string_utf8(env,args[i],nullptr,0,&lengths[i])!=0){napi_throw_error(env,"EINVAL","Expected string paths");return nullptr;}
    paths[i].resize(lengths[i]+1);
    if(napi_get_value_string_utf8(env,args[i],paths[i].data(),paths[i].size(),&lengths[i])!=0||strlen(paths[i].data())!=lengths[i]){napi_throw_error(env,"EINVAL","Invalid path");return nullptr;}
  }
  if(renamex_np(paths[0].data(),paths[1].data(),RENAME_EXCL)!=0){const int error=errno;napi_throw_error(env,error==EEXIST?"EEXIST":"MOVE_FAILED",strerror(error));return nullptr;}
  napi_get_undefined(env,&result);return result;
}

static napi_value attach(napi_env env, napi_callback_info info) {
  size_t argc = 2, length = 0; napi_value args[2], result;
  void* data = nullptr;
  if (napi_get_cb_info(env, info, &argc, args, nullptr, nullptr) != 0 || argc < 1 ||
      napi_get_buffer_info(env, args[0], &data, &length) != 0 || length != sizeof(void*)) {
    napi_throw_error(env, nullptr, "Expected an Electron native window handle"); return nullptr;
  }
  NSView* view = (__bridge NSView*)(*(void**)data);
  NSWindow* window = view.window;
  bool interactive = false;
  if (argc > 1) napi_get_value_bool(env,args[1],&interactive);
  window.level = interactive ? NSFloatingWindowLevel : CGWindowLevelForKey(kCGDesktopIconWindowLevelKey) + 1;
  window.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces |
    NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorIgnoresCycle;
  if(window.visible)[window orderFrontRegardless];
  napi_get_undefined(env, &result); return result;
}
static napi_value openLoginSettings(napi_env env,napi_callback_info info) {
  if (@available(macOS 13.0,*)) [SMAppService openSystemSettingsLoginItems];
  napi_value result; napi_get_undefined(env,&result);return result;
}
__attribute__((visibility("default"))) napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  napi_value function;
  napi_create_function(env, "attach", 6, attach, nullptr, &function);
  napi_set_named_property(env, exports, "attach", function);
  napi_create_function(env,"openLoginSettings",17,openLoginSettings,nullptr,&function);
  napi_set_named_property(env,exports,"openLoginSettings",function);
  napi_create_function(env,"moveExclusive",13,moveExclusive,nullptr,&function);
  napi_set_named_property(env,exports,"moveExclusive",function);
  return exports;
}
}
