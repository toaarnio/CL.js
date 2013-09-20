// WebCL Validator: validation stage.
#define _WCL_ADDRESS_SPACE_private_MIN (((96 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_private_ALIGNMENT (64/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_global_MIN (((128 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_global_ALIGNMENT (128/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_local_MIN (((128 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_local_ALIGNMENT (128/CHAR_BIT)
#define _WCL_ADDRESS_SPACE_constant_MIN (((8 + (CHAR_BIT - 1)) / CHAR_BIT))
#define _WCL_ADDRESS_SPACE_constant_ALIGNMENT (8/CHAR_BIT)
typedef struct _WclStruct {
    float table[3];
} TempStruct;

typedef struct {
    int _wcl_table[3];
    __global int * _wcl_tableOfGlobalASPtrs[2];
    __local int * _wcl_tableOfLocalASPtrs[2];
    TempStruct _wcl_private_struct;
    int _wcl_uninit_table[3];
    int _wcl_2_table[3];
} __attribute__ ((aligned (_WCL_ADDRESS_SPACE_private_ALIGNMENT))) _WclPrivates;

typedef struct {
    size_t _wcl_localTable[3];
    TempStruct _wcl_localStruct;
    TempStruct _wcl_localStructTable[2];
    size_t _wcl_lottery_winner;
} __attribute__ ((aligned (_WCL_ADDRESS_SPACE_local_ALIGNMENT))) _WclLocals;

typedef struct {
    float4 base_factor;
} __attribute__ ((aligned (_WCL_ADDRESS_SPACE_constant_ALIGNMENT))) _WclConstants;

typedef struct {
    __global float4 *awesomize__input_min;
    __global float4 *awesomize__input_max;
    __global float4 *awesomize__output_min;
    __global float4 *awesomize__output_max;
    __global float4 *awesomize__factors_min;
    __global float4 *awesomize__factors_max;
} _WclGlobalLimits;

typedef struct {
    __constant _WclConstants * _wcl_constant_allocations_min;
    __constant _WclConstants * _wcl_constant_allocations_max;
} _WclConstantLimits;

typedef struct {
    __local _WclLocals * _wcl_locals_min;
    __local _WclLocals * _wcl_locals_max;
    __local float4 *awesomize__scratch_min;
    __local float4 *awesomize__scratch_max;
} _WclLocalLimits;

typedef struct {
    _WclGlobalLimits gl;
    __global uint *gn;
    _WclConstantLimits cl;
    __constant uint *cn;
    _WclLocalLimits ll;
    __local uint *ln;
    _WclPrivates pa;
    __private uint *pn;
} _WclProgramAllocations;

__constant _WclConstants _wcl_constant_allocations = { ((float4)(1.0f,2.0f,3.0f,4.0f)) };

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
#define _WCL_ADDR_global_3(type, addr, min0, max0, min1, max1, min2, max2, asnull) \
    ( \
    ( ( ((addr) >= ((type)min0)) && ((addr) <= _WCL_LAST(type, max0)) ) ? (addr) : \
        ( ( ((addr) >= ((type)min1)) && ((addr) <= _WCL_LAST(type, max1)) ) ? (addr) : \
            ( ( ((addr) >= ((type)min2)) && ((addr) <= _WCL_LAST(type, max2)) ) ? (addr) : \
                ((type)(asnull)) ) ) ) )
#define _WCL_ADDR_local_2(type, addr, min0, max0, min1, max1, asnull) \
    ( \
    ( ( ((addr) >= ((type)min0)) && ((addr) <= _WCL_LAST(type, max0)) ) ? (addr) : \
        ( ( ((addr) >= ((type)min1)) && ((addr) <= _WCL_LAST(type, max1)) ) ? (addr) : \
            ((type)(asnull)) ) ) )

// WebCL Validator: matching stage 2.
// WebCL Validator: matching stage 1.
// RUN: cat %s | %opencl-validator
// RUN: %webcl-validator %s 2>/dev/null | grep -v "Processing\|CHECK" | %opencl-validator
// RUN: %webcl-validator %s | grep -v CHECK | %FileCheck %s

;

__constant float4 base_factor = ((float4)(1.0f,2.0f,3.0f,4.0f));
// NOTE: Clang bug seems to get initializer rewriting wrong for vector types.
//       after the support if fixed we can use initializations wihtout extra braces.
// __constant float4 base_factor = (float4)(1.0f,2.0f,3.0f,4.0f);
// __constant__g float base_table[] = { 1.0f,2.0f,3.0f,4.0f };

void empty_params(_WclProgramAllocations *_wcl_allocs);
void init_scratch(_WclProgramAllocations *_wcl_allocs, size_t gid, size_t wgid, TempStruct *additional_shuffle, __global float4* input, __global float4* factors, __local float4* scratch);
__local float4* flip_to_awesomeness(_WclProgramAllocations *_wcl_allocs, size_t wgid, size_t wgsize, __local float4* scratch);

// CHECK: empty_params(_WclProgramAllocations *_wcl_allocs)
void empty_params(_WclProgramAllocations *_wcl_allocs) {
    int table[3];
}

void init_scratch(_WclProgramAllocations *_wcl_allocs, 
    size_t gid, size_t wgid,
    TempStruct *additional_shuffle,
    __global float4* input, __global float4* factors, __local float4* scratch) {
    (*(_WCL_ADDR_local_2(__local float4 *, (scratch)+(wgid), _wcl_allocs->ll._wcl_locals_min, _wcl_allocs->ll._wcl_locals_max, _wcl_allocs->ll.awesomize__scratch_min, _wcl_allocs->ll.awesomize__scratch_max, _wcl_allocs->ln))) = (*(_WCL_ADDR_global_3(__global float4 *, (input)+(gid), _wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, _wcl_allocs->gn)))*(*(_WCL_ADDR_global_3(__global float4 *, (factors)+(gid), _wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, _wcl_allocs->gn)))*(*(_WCL_ADDR_private_1(TempStruct *, (additional_shuffle), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn))).table[gid%3];
}

__local float4* flip_to_awesomeness(_WclProgramAllocations *_wcl_allocs, size_t wgid, size_t wgsize, __local float4* scratch) {
    float4 index_vec = (*(_WCL_ADDR_local_2(__local float4 *, (scratch)+(wgid), _wcl_allocs->ll._wcl_locals_min, _wcl_allocs->ll._wcl_locals_max, _wcl_allocs->ll.awesomize__scratch_min, _wcl_allocs->ll.awesomize__scratch_max, _wcl_allocs->ln)));
    float index_float = index_vec.x + index_vec.y + index_vec.z + index_vec.w;
    int index = (int)(index_float) % wgsize;
    return &(*(_WCL_ADDR_local_2(__local float4 *, (scratch)+(index), _wcl_allocs->ll._wcl_locals_min, _wcl_allocs->ll._wcl_locals_max, _wcl_allocs->ll.awesomize__scratch_min, _wcl_allocs->ll.awesomize__scratch_max, _wcl_allocs->ln)));
}

/**
 * input,output and factors needs to be the same size with global work size
 * scratch size should be the same that work group size is.
 */
__kernel void awesomize(
    __global float4* input, unsigned long _wcl_input_size,
    __global float4* output, unsigned long _wcl_output_size,
    __global float4* factors, unsigned long _wcl_factors_size,
    __local float4* scratch, unsigned long _wcl_scratch_size) {

    __local _WclLocals _wcl_locals;
    __local uint _wcl_local_null[_WCL_ADDRESS_SPACE_local_MIN];

    _WclProgramAllocations _wcl_allocations_allocation = {
        { &input[0], &input[_wcl_input_size],&output[0], &output[_wcl_output_size],&factors[0], &factors[_wcl_factors_size] },
        0,
        { &(&_wcl_constant_allocations)[0], &(&_wcl_constant_allocations)[1] },
        _wcl_constant_null,
        { &(&_wcl_locals)[0], &(&_wcl_locals)[1],&scratch[0], &scratch[_wcl_scratch_size] },
        _wcl_local_null,
        { },
        0

    };
    _WclProgramAllocations *_wcl_allocs = &_wcl_allocations_allocation;
    _wcl_allocs->gn = _WCL_SET_NULL(__global uint*, _WCL_ADDRESS_SPACE_global_MIN,_wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _WCL_SET_NULL(__global uint*, _WCL_ADDRESS_SPACE_global_MIN,_wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _WCL_SET_NULL(__global uint*, _WCL_ADDRESS_SPACE_global_MIN,_wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, (__global uint*)0)));
    if (_wcl_allocs->gn == (__global uint*)0) return; // not enough space to meet the minimum access. Would be great if we could give info about the problem for the user. 
    _wcl_allocs->pn = _WCL_SET_NULL(__private uint*, _WCL_ADDRESS_SPACE_private_MIN, &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), (__private uint*)0);
    if (_wcl_allocs->pn == (__private uint*)0) return; // not enough space to meet the minimum access. Would be great if we could give info about the problem for the user. 

    // => Local memory zeroing.
    _WCL_LOCAL_RANGE_INIT(_wcl_allocs->ll._wcl_locals_min, _wcl_allocs->ll._wcl_locals_max);
    _WCL_LOCAL_RANGE_INIT(_wcl_allocs->ll.awesomize__scratch_min, _wcl_allocs->ll.awesomize__scratch_max);
    _WCL_LOCAL_RANGE_INIT(_wcl_local_null, _wcl_local_null + _WCL_ADDRESS_SPACE_local_MIN);
    barrier(CLK_LOCAL_MEM_FENCE);
    // <= Local memory zeroing.


    // check empty arg list conversion
    empty_params(_wcl_allocs);
    // check removing qualifiers from tables and structs
    __local size_t localTable[3];
    __local TempStruct localStruct;
    __local TempStruct localStructTable[2];

    // Tables of pointers are always allocated from private memory
    // __local int __global * localTableOfGlobalASPtrs[2];
    __global int* tableOfGlobalASPtrs[2];
    __local int* tableOfLocalASPtrs[2];

    size_t gid = get_global_id(0);
    size_t wgid = get_local_id(0);
    size_t wgsize = get_local_size(0);

    TempStruct private_struct = { {0, 1, 2} };;_wcl_allocs->pa._wcl_private_struct = private_struct;
    int uninit_table[3];
    int table[3] = {1,2,3};;_WCL_MEMCPY(_wcl_allocs->pa._wcl_2_table,table);
    (*(_WCL_ADDR_private_1(int *, (_wcl_allocs->pa._wcl_2_table)+(1), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn))) = 1;
    __local size_t lottery_winner;

    init_scratch(_wcl_allocs, gid, wgid, &_wcl_allocs->pa._wcl_private_struct, input, factors, scratch);
    _wcl_locals._wcl_lottery_winner = gid;
    barrier(CLK_LOCAL_MEM_FENCE);

    if (gid == 0) {
        (*(_WCL_ADDR_global_3(__global float4 *, (output)+(0), _wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, _wcl_allocs->gn))) = _wcl_locals._wcl_lottery_winner + (*(_WCL_ADDR_global_3(__global float4 *, (input)+(0), _wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, _wcl_allocs->gn))).x + (*(_WCL_ADDR_private_1(float *, (_wcl_allocs->pa._wcl_private_struct.table)+(2), &_wcl_allocs->pa, (&_wcl_allocs->pa + 1), _wcl_allocs->pn)));
    } else {
        (*(_WCL_ADDR_global_3(__global float4 *, (output)+(gid), _wcl_allocs->gl.awesomize__input_min, _wcl_allocs->gl.awesomize__input_max, _wcl_allocs->gl.awesomize__output_min, _wcl_allocs->gl.awesomize__output_max, _wcl_allocs->gl.awesomize__factors_min, _wcl_allocs->gl.awesomize__factors_max, _wcl_allocs->gn))) = ((*(_WCL_ADDR_local_2(__local float4 *, (flip_to_awesomeness(_wcl_allocs, wgid, wgsize, scratch)), _wcl_allocs->ll._wcl_locals_min, _wcl_allocs->ll._wcl_locals_max, _wcl_allocs->ll.awesomize__scratch_min, _wcl_allocs->ll.awesomize__scratch_max, _wcl_allocs->ln))))*_wcl_constant_allocations.base_factor;
    }
}
