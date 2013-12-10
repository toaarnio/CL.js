// result[0] = 0xdeadbeef   if success
// result[0] = 0xffffffff   if error

kernel void scalars(global uint* result, 
                    char c,
                    short s,
                    int i,
                    long l,
                    uchar uc,
                    ushort us,
                    uint ui,
                    ulong ul,
                    float f)
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
  
  result[0] = 0xffffffff; // assume error

  if (cval  == 0x00000000000000ff &&
      sval  == 0x000000000000ffff &&
      ival  == 0x00000000ffffffff &&
      lval  == 0x00000000ffffffff &&
      ucval == 0x00000000000000ff &&
      usval == 0x000000000000ffff &&
      uival == 0x00000000ffffffff &&
      ulval == 0x00000000ffffffff &&
      fval  == 0x000000003f800000)
    {
      result[0] = 0xdeadbeef;
    }
}

// result[0] = 0xdeadbeef   if success
// result[0] = 0xffffffff   if error

kernel void vectors(global uint* result, 
                    char4 c,
                    short4 s,
                    int4 i,
                    //long4 l,
                    uchar4 uc,
                    ushort4 us,
                    uint4 ui,
                    //ulong4 ul,
                    float4 f)
{

  // cast all to ulong (64-bit), then compare

  ulong cval = convert_ulong((uchar)c.s2);
  ulong sval = convert_ulong((ushort)s.s2);
  ulong ival = convert_ulong((uint)i.s2);
  //ulong lval = convert_ulong((uint)l.s2);
  ulong ucval = convert_ulong(uc.s2);
  ulong usval = convert_ulong(us.s2);
  ulong uival = convert_ulong(ui.s2);
  //ulong ulval = convert_ulong(ul.s2);
  ulong fval = convert_ulong(as_uint(f.s2));
  
  result[0] = 0xffffffff; // assume error

  if (cval  == 0x00000000000000ff &&
      sval  == 0x000000000000ffff &&
      ival  == 0x00000000ffffffff &&
      //lval  == 0x00000000ffffffff &&
      ucval == 0x00000000000000ff &&
      usval == 0x000000000000ffff &&
      uival == 0x00000000ffffffff &&
      //ulval == 0x00000000ffffffff &&
      fval  == 0x000000003f800000)
    {
      result[0] = 0xdeadbeef;
    }
}
