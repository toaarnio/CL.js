#pragma OPENCL EXTENSION cl_khr_fp64 : enable

// result[0] = 0   if success
// result[0] = -1  if error

kernel void scalars(global int* result, 
                    char c,
                    short s,
                    int i,
                    long l,
                    uchar uc,
                    ushort us,
                    uint ui,
                    ulong ul,
                    float f,
                    double d) 
{
  // cast all to ulong (64-bit), then compare

  ulong cval = convert_ulong((uchar)c);
  ulong sval = convert_ulong((ushort)s);
  ulong ival = convert_ulong((uint)i);
  ulong lval = convert_ulong((uint)l);
  ulong ucval = convert_ulong(uc);
  ulong usval = convert_ulong(us);
  ulong uival = convert_ulong(ui);
  ulong ulval = convert_ulong(ul);
  ulong fval = convert_ulong(as_uint(f));
  ulong dval = convert_ulong(as_ulong(d));
  
  result[0] = -1; // assume error

  if (cval  == 0x00000000000000ff &&
      sval  == 0x000000000000ffff &&
      ival  == 0x00000000ffffffff &&
      lval  == 0x00000000ffffffff &&
      ucval == 0x00000000000000ff &&
      usval == 0x000000000000ffff &&
      uival == 0x00000000ffffffff &&
      ulval == 0x00000000ffffffff &&
      fval  == 0x000000003f800000 &&
      dval  == 0x3ff0000000000000) 
    {
      result[0] = 0;
    }
}

// result[0] = 0   if success
// result[0] = -1  if error

kernel void vectors(global int* result, float4 f) 
{
  result[0] = -1; // assume error
  if (f.x == 1.0) {
    result[0] = 0;
  }
}
