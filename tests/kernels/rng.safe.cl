// WebCL Validator: validation stage.

/* WebCL Validator JSON header
{
    "version" : "1.0",
    "kernels" :
        {
            "clRandom1D" :
                {
                    "dst" :
                        {
                            "index" : 0,
                            "host-type" : "cl_mem",
                            "host-element-type" : "cl_uchar4",
                            "address-space" : "global",
                            "size-parameter" : "_wcl_dst_size"
                        },
                    "_wcl_dst_size" :
                        {
                            "index" : 1,
                            "host-type" : "cl_ulong"
                        },
                    "seed" :
                        {
                            "index" : 2,
                            "host-type" : "cl_uint"
                        }
                }
        }
}
*/

#define _WCL_ADDRESS_SPACE_private_MIN (((32 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_private_ALIGNMENT (32/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_global_MIN (((32 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_global_ALIGNMENT (32/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_local_MIN (((8 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_local_ALIGNMENT (8/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_constant_MIN (((8 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_constant_ALIGNMENT (8/CHAR_BIT)
typedef struct {
    uint _wcl_k[4];
} __attribute__ ((aligned (_WCL_ADDRESS_SPACE_private_ALIGNMENT))) _WclPrivates;

typedef struct {
    uint ITER;
} __attribute__ ((aligned (_WCL_ADDRESS_SPACE_constant_ALIGNMENT))) _WclConstants;

typedef struct {
    __global uchar4 *clRandom1D__dst_min;
    __global uchar4 *clRandom1D__dst_max;
} _WclGlobalLimits;

typedef struct {
    __constant _WclConstants * _wcl_constant_allocations_min;
    __constant _WclConstants * _wcl_constant_allocations_max;
} _WclConstantLimits;

typedef struct {
    _WclGlobalLimits gl;
    __global uint *gn;
    _WclConstantLimits cl;
    __constant uint *cn;
    _WclPrivates pa;
    __private uint *pn;
} _WclProgramAllocations;

__constant _WclConstants _wcl_constant_allocations = { 15 };

__constant uint _wcl_constant_null[_WCL_ADDRESS_SPACE_constant_MIN] = { 0 };

// => General code that doesn't depend on input.

#define _WCL_MEMCPY(dst, src) for(ulong i = 0; i < sizeof((src))/sizeof((src)[0]); i++) { (dst)[i] = (src)[i]; }

#define _WCL_LAST(type, ptr) (((type)(ptr)) - 1)
#define _WCL_FILLCHAR ((uchar)0xCC)

// POCL crashes at run time if the parameters are local character
// pointers.
typedef uint _WclInitType;

// NOTE: this expects that null pointer is type of uint*
#define _WCL_SET_NULL(type, req_bytes, min, max, null) ( ((((type)max)-((type)min))*sizeof(uint) >= req_bytes) ? ((type)min) : (null) )

#ifdef cl_khr_initialize_memory
#pragma OPENCL EXTENSION cl_khr_initialize_memory : enable
#define _WCL_LOCAL_RANGE_INIT(begin, end)
#else

#define _WCL_LOCAL_RANGE_INIT(begin, end) do {               \
    __local uchar *start = (__local uchar *)begin;           \
    __local uchar *stop = (__local uchar *)end;              \
    const size_t z_items = get_local_size(2);                \
    const size_t yz_items = get_local_size(1) * z_items;     \
    const size_t xyz_items = get_local_size(0) * yz_items;   \
    const size_t item_index =                                \
        (get_local_id(0) * yz_items) +                       \
        (get_local_id(1) * z_items) +                        \
        get_local_id(2);                                     \
    size_t item_count = stop - start;                        \
    size_t items_per_kernel = item_count / xyz_items;        \
    size_t items_offset = items_per_kernel * item_index;     \
    size_t reminders = item_count % xyz_items;               \
    if (item_index < reminders) {                            \
        start[xyz_items*items_per_kernel + item_index] = _WCL_FILLCHAR; \
    }                                                                   \
    for (size_t i = 0; i < items_per_kernel; i++) {                     \
        start[items_offset+i] = _WCL_FILLCHAR;                          \
    }                                                                   \
} while (0)                                                             \

#endif // cl_khr_initialize_memory

// <= General code that doesn't depend on input.

#define _WCL_ADDR_private_1(type, addr, min0, max0, asnull) \
    ( \
    ( ( ((addr) >= ((type)min0)) && ((addr) <= _WCL_LAST(type, max0)) ) ? (addr) : \
        ((type)(asnull)) ) )
#define _WCL_ADDR_global_1(type, addr, min0, max0, asnull) \
    ( \
    ( ( ((addr) >= ((type)min0)) && ((addr) <= _WCL_LAST(type, max0)) ) ? (addr) : \
        ((type)(asnull)) ) )

// WebCL Validator: matching stage 2.
// WebCL Validator: matching stage 1.
/**
 * A random number generator based on the Tiny Encryption Algorithm (TEA),
 * as proposed by Zafar et al. in "GPU Random Numbers via the Tiny Encryption
 * Algorithm" at High Performance Graphics 2010.
 * 
 * Generates a pair of 32-bit random numbers from the given pair of 32-bit
 * seed values. The number of iterations can be adjusted depending on the
 * required degree of randomness: 16 iterations is typically enough for any
 * use, but even 2 or 4 may be enough for less demanding use cases. Note
 * that the required number of iterations is proportional to how "random"
 * the seed values are.
 * 
 * @param {uint2} seed an arbitrary seed for the random number generator
 * @param {uint} iterations the number of times to iterate in the generator
 * @return {uint2} a pair of 32-bit random numbers generated from the seed
 *
 * @author Tomi Aarnio
 * @license MIT, LGPL
 */

uint2 rand(_WclProgramAllocations *_wcl_allocs, uint2 seed, uint iterations) {
  uint sum = 0;
  uint delta = 0x9E3779B9;
  uint k[4] = { 0xA341316C, 0xC8013EA4, 0xAD90777D, 0x7E95761E };;_WCL_MEMCPY(_wcl_allocs->pa._wcl_k,k);

  for (int j=0; j < iterations; j++) {
    sum += delta;
    seed.x += ((seed.y << 4) + (*(_WCL_ADDR_private_1(uint *, (_wcl_allocs->pa._wcl_k)+(0), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn)))) & (seed.y + sum) & ((seed.y >> 5) + (*(_WCL_ADDR_private_1(uint *, (_wcl_allocs->pa._wcl_k)+(1), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn))));
    seed.y += ((seed.x << 4) + (*(_WCL_ADDR_private_1(uint *, (_wcl_allocs->pa._wcl_k)+(2), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn)))) & (seed.x + sum) & ((seed.x >> 5) + (*(_WCL_ADDR_private_1(uint *, (_wcl_allocs->pa._wcl_k)+(3), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn))));
  }

  return seed;
}

/**
 * The number of times to iterate the random number generator; higher values
 * provide more random results. Fifteen iterations is enough to avoid any
 * visually discernible regularities in the output, but even 5-10 would be
 * enough for many uses.
 */

__constant uint ITER = 15;

/**
 * Fills the given 1D buffer with random colors to visualize the results
 * of the TEA random number generator (RNG).
 *
 * @param {uchar4*} dst the buffer to fill with random values
 * @param {uint} seed an arbitrary seed value to initialize the RNG with
 *
 * @author Tomi Aarnio
 * @license MIT, LGPL
 */

kernel void clRandom1D(__global uchar4* dst, unsigned long _wcl_dst_size, uint seed)
{
    __local uint _wcl_local_null[_WCL_ADDRESS_SPACE_local_MIN];

    _WclProgramAllocations _wcl_allocations_allocation = {
        { &dst[0], &dst[_wcl_dst_size] },
        0,
        { &(&_wcl_constant_allocations)[0], &(&_wcl_constant_allocations)[1] },
        _wcl_constant_null,
        { },
        0

    };
    _WclProgramAllocations *_wcl_allocs = &_wcl_allocations_allocation;
    _wcl_allocs->gn = _WCL_SET_NULL(__global uint*, _WCL_ADDRESS_SPACE_global_MIN,_wcl_allocs->gl.clRandom1D__dst_min, _wcl_allocs->gl.clRandom1D__dst_max, (__global uint*)0);
    if (_wcl_allocs->gn == (__global uint*)0) return; // not enough space to meet the minimum access. Would be great if we could give info about the problem for the user. 
    _wcl_allocs->pn = _WCL_SET_NULL(__private uint*, _WCL_ADDRESS_SPACE_private_MIN, &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), (__private uint*)0);
    if (_wcl_allocs->pn == (__private uint*)0) return; // not enough space to meet the minimum access. Would be great if we could give info about the problem for the user. 

  uint x = get_global_id(0);
  uint2 rnd = (uint2)(seed, seed << 3);
  rnd.x += x + (x << 11) + (x << 19);
  rnd.y += x + (x << 9) + (x << 21);
  rnd = rand(_wcl_allocs, rnd, _wcl_constant_allocations.ITER);
  uchar r = rnd.x & 0xff;
  float alpha = (rnd.x & 0xff00) >> 8;
  (*(_WCL_ADDR_global_1(__global uchar4 *, (dst)+(x), _wcl_allocs->gl.clRandom1D__dst_min, _wcl_allocs->gl.clRandom1D__dst_max, _wcl_allocs->gn))) = (uchar4)(r, r, r, alpha);
}
