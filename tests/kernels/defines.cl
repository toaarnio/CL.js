#if !defined(FOO)
#error FOO is not defined!
#endif

#if (FOO != true)
#error FOO is not equal to 'true'
#endif

#if !defined(BAR)
#error BAR is not defined!
#endif

#if BAR != baz
#error BAR is not equal to 'baz'
#endif

kernel void defines(global int* retval) {
  retval[0] = get_global_id(0);
}
