#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>
#include <stdint.h>
#include <stddef.h>

// Stable Node-API C ABI. No V8 / Electron version-specific headers are needed.
extern "C" {
typedef struct napi_env__* napi_env;
typedef struct napi_value__* napi_value;
typedef struct napi_callback_info__* napi_callback_info;
typedef napi_value (*napi_callback)(napi_env, napi_callback_info);
int napi_get_cb_info(napi_env, napi_callback_info, size_t*, napi_value*, napi_value*, void**);
int napi_get_buffer_info(napi_env, napi_value, void**, size_t*);
int napi_create_function(napi_env, const char*, size_t, napi_callback, void*, napi_value*);
int napi_set_named_property(napi_env, napi_value, const char*, napi_value);
int napi_get_undefined(napi_env, napi_value*);
int napi_throw_error(napi_env, const char*, const char*);

static napi_value attach(napi_env env, napi_callback_info info) {
  size_t argc = 1, length = 0; napi_value args[1], result;
  void* data = nullptr;
  if (napi_get_cb_info(env, info, &argc, args, nullptr, nullptr) != 0 || argc != 1 ||
      napi_get_buffer_info(env, args[0], &data, &length) != 0 || length != sizeof(void*)) {
    napi_throw_error(env, nullptr, "Expected an Electron native window handle"); return nullptr;
  }
  NSView* view = (__bridge NSView*)(*(void**)data);
  NSWindow* window = view.window;
  window.level = CGWindowLevelForKey(kCGDesktopIconWindowLevelKey) + 1;
  window.collectionBehavior = NSWindowCollectionBehaviorCanJoinAllSpaces |
    NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorIgnoresCycle;
  [window orderFrontRegardless];
  napi_get_undefined(env, &result); return result;
}
__attribute__((visibility("default"))) napi_value napi_register_module_v1(napi_env env, napi_value exports) {
  napi_value function;
  napi_create_function(env, "attach", 6, attach, nullptr, &function);
  napi_set_named_property(env, exports, "attach", function);
  return exports;
}
}
