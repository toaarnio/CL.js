#define FOO true

#if !defined(FOO)
#error FOO is not defined!
#endif

#if !defined(BAR)
#error BAR is not defined!
#endif

kernel void defines(global int* retval) {
  retval[0] = get_global_id(0);
}

