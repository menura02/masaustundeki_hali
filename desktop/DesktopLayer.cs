using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

// Keep a top-level rug immediately above Explorer's desktop, below normal windows.
// No foreign process injection, undocumented messages, reparenting or desktop changes.
class DesktopLayer {
  delegate bool EnumProc(IntPtr hwnd, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr data);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd,uint command);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd,int command);
  [DllImport("user32.dll",SetLastError=true)] static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int cx,int cy,uint flags);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint processId);
  static volatile bool running=true, interactive=false;
  const uint PositionOnly=0x0001|0x0002|0x0010|0x0200; // NOSIZE, NOMOVE, NOACTIVATE, NOOWNERZORDER
  static IntPtr Desktop() {
    IntPtr desktop=IntPtr.Zero;
    EnumWindows(delegate(IntPtr hwnd,IntPtr data){
      if(IsWindowVisible(hwnd)&&FindWindowEx(hwnd,IntPtr.Zero,"SHELLDLL_DefView",null)!=IntPtr.Zero){desktop=hwnd;return false;}
      return true;
    },IntPtr.Zero);
    return desktop;
  }
  static void Main(string[] args) {
    if(args.Length==1&&args[0]=="--probe"){
      IsWindow(IntPtr.Zero);
      Console.WriteLine(new JavaScriptSerializer().Serialize(new {probe=true,pointerSize=IntPtr.Size}));return;
    }
    if(args.Length!=2)return;
    IntPtr rug=new IntPtr(Int64.Parse(args[0]));uint expected=UInt32.Parse(args[1]);
    Console.OutputEncoding=new System.Text.UTF8Encoding(false);
    var json=new JavaScriptSerializer();
    Task.Run(delegate {
      string command;
      while((command=Console.ReadLine())!=null){
        if(command=="interactive")interactive=true;
        else if(command=="desktop")interactive=false;
        else if(command=="quit")break;
      }
      running=false;
    });
    bool? previous=null;
    while(running&&IsWindow(rug)){
      uint owner;GetWindowThreadProcessId(rug,out owner);if(owner!=expected)break;
      bool available=false;
      if(interactive){available=true;}
      else {
        IntPtr desktop=Desktop();
        if(desktop!=IntPtr.Zero){
          // Win+D may minimize normal app windows. The rug stays part of the desktop.
          if(IsIconic(rug))ShowWindow(rug,4); // SW_SHOWNOACTIVATE
          if(!IsWindowVisible(rug)){available=true;}
          else {
            IntPtr above=GetWindow(desktop,3); // GW_HWNDPREV
            available=above==rug||SetWindowPos(rug,above,0,0,0,0,PositionOnly);
          }
        }
      }
      if(previous!=available){Console.WriteLine(json.Serialize(new {available=available}));previous=available;}
      Thread.Sleep(200);
    }
  }
}
