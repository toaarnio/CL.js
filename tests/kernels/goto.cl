kernel void foo(global uchar* retval) {
  int gid = get_global_id(0);
  if (gid > 0) goto foobar;
  retval[gid] = 0;
  return;

foobar:
  retval[gid] = 1;
}
