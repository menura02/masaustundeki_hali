using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;
using Accessibility;

// Read-only Explorer accessibility client. Never moves, opens or changes icons/files.
class DesktopIcons {
  delegate bool EnumProc(IntPtr hwnd, IntPtr data);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc callback, IntPtr data);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr context);
  [DllImport("oleacc.dll")] static extern int AccessibleObjectFromWindow(IntPtr hwnd, uint id, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IAccessible obj);
  [DllImport("oleacc.dll")] static extern int AccessibleChildren(IAccessible parent, int start, int count, [Out, MarshalAs(UnmanagedType.LPArray, SizeParamIndex=2)] object[] children, out int obtained);
  static object Scan() {
    IntPtr list=IntPtr.Zero;
    EnumWindows(delegate(IntPtr hwnd, IntPtr data) {
      IntPtr view=FindWindowEx(hwnd,IntPtr.Zero,"SHELLDLL_DefView",null);
      if(view!=IntPtr.Zero)list=FindWindowEx(view,IntPtr.Zero,"SysListView32",null);
      return list==IntPtr.Zero;
    },IntPtr.Zero);
    if(list==IntPtr.Zero)throw new Exception("Explorer masaüstü bulunamadı.");
    var icons=new List<object>();
    if(!IsWindowVisible(list))return new { available=true, icons=icons };
    Guid iid=new Guid("618736E0-3C3D-11CF-810C-00AA00389B71");
    IAccessible root;
    Marshal.ThrowExceptionForHR(AccessibleObjectFromWindow(list,0xFFFFFFFC,ref iid,out root));
    try {
      int count=root.accChildCount,obtained;
      object[] children=new object[count];
      Marshal.ThrowExceptionForHR(AccessibleChildren(root,0,count,children,out obtained));
      for(int i=0;i<obtained;i++) {
        IAccessible child=children[i] as IAccessible;
        IAccessible obj=child??root;object id=child==null?children[i]:0;
        try {
          int x,y,w,h;obj.accLocation(out x,out y,out w,out h,id);
          int state=Convert.ToInt32(obj.get_accState(id));
          if(w<=0||h<=0||(state&0x8000)!=0)continue;
          string name=obj.get_accName(id);
          if(!String.IsNullOrEmpty(name))icons.Add(new {name=name,x=x,y=y,width=w,height=h});
        } finally {if(child!=null)Marshal.ReleaseComObject(child);}
      }
    } finally {Marshal.ReleaseComObject(root);}
    return new { available=true, icons=icons };
  }
  [STAThread] static void Main() {
    Console.OutputEncoding=new UTF8Encoding(false);
    try {SetProcessDpiAwarenessContext(new IntPtr(-4));} catch {}
    var json=new JavaScriptSerializer();
    while(Console.ReadLine()!=null) {
      try {Console.WriteLine(json.Serialize(Scan()));}
      catch(Exception e){Console.WriteLine(json.Serialize(new {available=false,icons=new object[0],error=e.Message}));}
    }
  }
}
