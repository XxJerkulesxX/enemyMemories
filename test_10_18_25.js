/**
 * @param {number[]} numsyo
 * @param {number} k2
 * @return {number}
 */
let maxDistinctElements = function(nums, k = 0) {
//nums is input array
// determine if nums is a set


};
function isFloat(num) {
      return num % 1 !== 0;
    };

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const setA = Array.from({ length: randomInt(4, 8) }, () => randomInt(0, 100));
const setB = Array.from({ length: randomInt(4, 8) }, () => randomInt(0, 100));

let isFloatRes = isFloat(5.74);

console.log('Set A:', setA);
console.log('Set B:', setB);








// Generate 10 arrays of 10 random integers each, between -100 and 100
const arrays = [];

for (let i = 0; i < 10; i++) {
  const arr = [];
  for (let j = 0; j < 10; j++) {
    const randomInt = Math.floor(Math.random() * 201) - 100;
    arr.push(randomInt);
  }
  arrays.push(arr);
}

// we need the original array. 

// A and B are arrays of unique integers (order irrelevant)
function isSubset(A, B) {
  // Put the larger of A/B into a Set only if you’ll reuse it; for a single check,
  // just pick B as the membership set since we check A's elements.
  const setB = new Set(B);
  
  for (const x of A) {
    console.log(x);
    if (!setB.has(x)) return false; // element from A exsists within B 
  }
  return true;
};


let result = isSubset(arrays[0], arrays[1]);

console.log('hewwo');

// Imagine an abstract "time" function — not real ms, just symbolic
function T(n) {
  return c * n;  // this represents O(n)
};


// Constant time: O(1)
function constantTime(n) {
  return c; // doesn’t change with n
};

// Linear time: O(n)
function linearTime(n) {
  return c * n;
};

// Quadratic time: O(n^2)
function quadraticTime(n) {
  return c * n * n;
};

function logarithmicTime(n, c = 1) {
  return c * Math.log2(n);  // base-2 logarithm (binary growth)
};



// Sorted array, O(log n) search
function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = arr[mid];
    if (value === target) return mid;          // found
    if (value < target) low = mid + 1;         // search right half
    else high = mid - 1;                       // search left half
  }
  return -1; // not found
};





