/* PrepDeck — Coding problem bank (deterministic, 500+ challenges) */
(function () {
  "use strict";

  var LEVELS = ["Easy", "Medium", "Hard"];

  /* Each base problem: t=title, d=task, i=sample input, o=sample output, e=explanation */
  var BASE = {
    "Arrays": [
      { t: "Pair Sum", d: "find two indices whose values add up to a given target", i: "nums = [2,7,11,15], target = 9", o: "[0,1]", e: "2 + 7 equals the target 9, so indices 0 and 1 are returned." },
      { t: "Maximum Subarray Sum", d: "return the largest sum obtainable from any contiguous subarray", i: "nums = [-2,1,-3,4,-1,2,1,-5,4]", o: "6", e: "The subarray [4,-1,2,1] gives the maximum sum 6." },
      { t: "Rotate Array by K", d: "rotate the array to the right by k positions in place", i: "nums = [1,2,3,4,5], k = 2", o: "[4,5,1,2,3]", e: "Each element shifts two places right and wraps around." },
      { t: "Move Zeroes", d: "move every zero to the end while keeping the relative order of other elements", i: "nums = [0,1,0,3,12]", o: "[1,3,12,0,0]", e: "Non-zero values keep their order and zeroes are pushed to the tail." },
      { t: "Majority Element", d: "return the element appearing more than n/2 times", i: "nums = [3,2,3]", o: "3", e: "3 appears twice out of three elements, which is more than n/2." },
      { t: "Product Except Self", d: "return an array where each position holds the product of all other elements", i: "nums = [1,2,3,4]", o: "[24,12,8,6]", e: "Prefix and suffix products are combined without using division." },
      { t: "Merge Sorted Arrays", d: "merge two sorted arrays into one sorted array", i: "a = [1,3,5], b = [2,4,6]", o: "[1,2,3,4,5,6]", e: "Two pointers pick the smaller head each step." },
      { t: "Missing Number", d: "find the missing number in a sequence from 1 to n", i: "nums = [1,2,4,5]", o: "3", e: "Expected sum 15 minus actual sum 12 gives the missing value 3." },
      { t: "Longest Consecutive Run", d: "return the length of the longest run of consecutive integers", i: "nums = [100,4,200,1,3,2]", o: "4", e: "The run 1,2,3,4 has length 4." },
      { t: "Trapping Rain Water", d: "compute how much water is trapped between the bars", i: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", o: "6", e: "Water above each bar is bounded by the smaller of the max heights on both sides." },
      { t: "Subarray Sum Equals K", d: "count the subarrays whose sum equals k", i: "nums = [1,1,1], k = 2", o: "2", e: "Two overlapping subarrays of length two sum to 2." },
      { t: "Kth Largest Element", d: "return the kth largest element in the array", i: "nums = [3,2,1,5,6,4], k = 2", o: "5", e: "Sorted descending the second value is 5." },
      { t: "Dutch National Flag", d: "sort an array containing only 0s, 1s and 2s in one pass", i: "nums = [2,0,2,1,1,0]", o: "[0,0,1,1,2,2]", e: "Three pointers partition the array in a single traversal." },
      { t: "Maximum Circular Subarray", d: "find the maximum sum of a circular subarray", i: "nums = [5,-3,5]", o: "10", e: "Wrapping around, the elements 5 and 5 give 10." }
    ],
    "Strings": [
      { t: "Valid Palindrome", d: "check whether the string reads the same forwards and backwards ignoring case and non-alphanumerics", i: "s = \"A man, a plan, a canal: Panama\"", o: "true", e: "After cleaning, the string is symmetric." },
      { t: "Longest Substring Without Repeats", d: "return the length of the longest substring without repeating characters", i: "s = \"abcabcbb\"", o: "3", e: "\"abc\" is the longest window with unique characters." },
      { t: "Anagram Check", d: "determine whether two strings are anagrams of each other", i: "a = \"listen\", b = \"silent\"", o: "true", e: "Both strings have identical character frequencies." },
      { t: "String Compression", d: "compress the string using counts of repeated characters", i: "s = \"aabcccccaaa\"", o: "a2b1c5a3", e: "Each run is replaced by the character followed by its length." },
      { t: "First Unique Character", d: "return the index of the first non-repeating character", i: "s = \"loveleetcode\"", o: "2", e: "'v' is the first character that appears exactly once." },
      { t: "Group Anagrams", d: "group the words that are anagrams of each other", i: "words = [\"eat\",\"tea\",\"tan\",\"ate\"]", o: "[[\"eat\",\"tea\",\"ate\"],[\"tan\"]]", e: "Sorted letters are used as the grouping key." },
      { t: "Longest Common Prefix", d: "find the longest common prefix among all strings", i: "words = [\"flower\",\"flow\",\"flight\"]", o: "fl", e: "All three words start with \"fl\"." },
      { t: "Reverse Words", d: "reverse the order of words in a sentence", i: "s = \"the sky is blue\"", o: "blue is sky the", e: "Words are split, reversed and joined with single spaces." },
      { t: "Pattern Matching with Wildcards", d: "match the string against a pattern containing '?' and '*'", i: "s = \"adceb\", p = \"*a*b\"", o: "true", e: "The wildcards absorb \"dce\" so the pattern matches." },
      { t: "Minimum Window Substring", d: "find the smallest window in s containing all characters of t", i: "s = \"ADOBECODEBANC\", t = \"ABC\"", o: "BANC", e: "\"BANC\" is the shortest window covering A, B and C." },
      { t: "Palindromic Substrings Count", d: "count how many palindromic substrings the string contains", i: "s = \"aaa\"", o: "6", e: "Three single letters, two pairs and one triple are palindromes." },
      { t: "Roman to Integer", d: "convert a Roman numeral into an integer", i: "s = \"MCMXCIV\"", o: "1994", e: "Subtractive pairs CM and XC and IV are handled while scanning." },
      { t: "Word Frequency Ranking", d: "return the k most frequent words in lexicographic tie order", i: "words = [\"i\",\"love\",\"code\",\"i\"], k = 1", o: "[\"i\"]", e: "\"i\" occurs twice which is the highest count." },
      { t: "Check Rotation", d: "check whether one string is a rotation of another", i: "a = \"abcde\", b = \"cdeab\"", o: "true", e: "b is a substring of a concatenated with itself." }
    ],
    "Linked Lists": [
      { t: "Reverse Linked List", d: "reverse a singly linked list", i: "1->2->3->4->NULL", o: "4->3->2->1->NULL", e: "Pointers are re-linked one node at a time." },
      { t: "Detect Cycle", d: "detect whether the linked list contains a cycle", i: "3->2->0->-4, tail connects to node 1", o: "true", e: "Slow and fast pointers meet inside the loop." },
      { t: "Merge Two Sorted Lists", d: "merge two sorted linked lists into one sorted list", i: "l1 = 1->2->4, l2 = 1->3->4", o: "1->1->2->3->4->4", e: "The smaller head is appended at each step." },
      { t: "Remove Nth Node From End", d: "remove the nth node counting from the end of the list", i: "1->2->3->4->5, n = 2", o: "1->2->3->5", e: "A gap of n between two pointers locates the node." },
      { t: "Middle of the List", d: "return the middle node of the linked list", i: "1->2->3->4->5", o: "3", e: "The fast pointer reaches the end when the slow pointer is at the middle." },
      { t: "Palindrome Linked List", d: "check whether the linked list is a palindrome", i: "1->2->2->1", o: "true", e: "The second half is reversed and compared with the first." },
      { t: "Intersection of Two Lists", d: "find the node where two linked lists intersect", i: "listA = 4->1->8->4->5, listB = 5->6->1->8->4->5", o: "8", e: "Both pointers meet at the shared node after switching heads." },
      { t: "Add Two Numbers", d: "add two numbers represented by linked lists in reverse order", i: "l1 = 2->4->3, l2 = 5->6->4", o: "7->0->8", e: "342 + 465 = 807 stored in reverse order." },
      { t: "Remove Duplicates from Sorted List", d: "delete duplicate nodes from a sorted linked list", i: "1->1->2->3->3", o: "1->2->3", e: "Equal neighbours are skipped during a single pass." },
      { t: "Rotate List", d: "rotate the linked list to the right by k places", i: "1->2->3->4->5, k = 2", o: "4->5->1->2->3", e: "The list is closed into a ring and reopened at the new head." },
      { t: "Reverse Nodes in K-Group", d: "reverse the nodes of the list k at a time", i: "1->2->3->4->5, k = 2", o: "2->1->4->3->5", e: "Each complete group of two is reversed, the remainder is untouched." },
      { t: "Flatten Multilevel List", d: "flatten a multilevel doubly linked list into a single level", i: "1->2->3 with 2 having child 7->8", o: "1->2->7->8->3", e: "Child lists are spliced in before continuing." },
      { t: "Copy List with Random Pointer", d: "deep copy a linked list where every node has an extra random pointer", i: "[[7,null],[13,0]]", o: "[[7,null],[13,0]]", e: "Interleaved cloning maps original nodes to copies." },
      { t: "Sort Linked List", d: "sort a linked list in ascending order", i: "4->2->1->3", o: "1->2->3->4", e: "Merge sort splits the list and merges sorted halves." }
    ],
    "Stacks": [
      { t: "Valid Parentheses", d: "check whether the bracket sequence is balanced", i: "s = \"{[()]}\"", o: "true", e: "Every closing bracket matches the most recent opening bracket." },
      { t: "Min Stack", d: "design a stack that returns the minimum element in constant time", i: "push(-2), push(0), push(-3), getMin()", o: "-3", e: "An auxiliary stack tracks the running minimum." },
      { t: "Next Greater Element", d: "find the next greater element for every array position", i: "nums = [4,5,2,25]", o: "[5,25,25,-1]", e: "A decreasing stack resolves each pending element when a larger value appears." },
      { t: "Evaluate Postfix", d: "evaluate a postfix expression", i: "expr = \"231*+9-\"", o: "-4", e: "Operands are pushed and operators pop two values." },
      { t: "Largest Rectangle in Histogram", d: "find the largest rectangle area in a histogram", i: "heights = [2,1,5,6,2,3]", o: "10", e: "Bars of height 5 and 6 form a rectangle of width 2." },
      { t: "Stock Span", d: "compute the stock span for each day", i: "prices = [100,80,60,70,60,75,85]", o: "[1,1,1,2,1,4,6]", e: "The stack keeps indices of previous higher prices." },
      { t: "Sort a Stack", d: "sort a stack using only stack operations", i: "[34,3,31,98,92,23]", o: "[3,23,31,34,92,98]", e: "A temporary stack holds elements in sorted order." },
      { t: "Redundant Brackets", d: "detect redundant brackets in an expression", i: "expr = \"((a+b))\"", o: "true", e: "A pair of brackets encloses no operator, so it is redundant." },
      { t: "Decode String", d: "decode a string encoded with repeat counts", i: "s = \"3[a2[c]]\"", o: "accaccacc", e: "Nested counts are resolved with two stacks." },
      { t: "Infix to Postfix", d: "convert an infix expression to postfix", i: "expr = \"a+b*c\"", o: "abc*+", e: "Operator precedence controls when operators are popped." },
      { t: "Celebrity Problem", d: "identify the celebrity in a party matrix using a stack", i: "n = 3, knows(0,1)=1", o: "1", e: "Candidates are eliminated pairwise until one remains." },
      { t: "Maximum Area Rectangle in Binary Matrix", d: "find the maximum rectangle of 1s in a binary matrix", i: "matrix = [[1,0,1],[1,1,1]]", o: "3", e: "Each row is treated as a histogram base." },
      { t: "Implement Queue Using Stacks", d: "implement a FIFO queue using two stacks", i: "push(1), push(2), pop()", o: "1", e: "Elements are transferred to the second stack to reverse order." },
      { t: "Asteroid Collision", d: "simulate asteroid collisions on a line", i: "asteroids = [5,10,-5]", o: "[5,10]", e: "The -5 asteroid explodes against 10." }
    ],
    "Queues": [
      { t: "Implement Circular Queue", d: "implement a fixed-size circular queue", i: "enqueue(1), enqueue(2), dequeue()", o: "1", e: "Head and tail indices wrap using modulo arithmetic." },
      { t: "Sliding Window Maximum", d: "return the maximum of every window of size k", i: "nums = [1,3,-1,-3,5], k = 3", o: "[3,3,5]", e: "A deque stores indices in decreasing value order." },
      { t: "First Non-Repeating in Stream", d: "report the first non-repeating character after each character of a stream", i: "stream = \"aabc\"", o: "a#bb", e: "A queue holds candidates while counts are tracked." },
      { t: "Generate Binary Numbers", d: "generate the first n binary numbers using a queue", i: "n = 5", o: "1 10 11 100 101", e: "Each dequeued value produces two children." },
      { t: "Rotten Oranges", d: "find the minimum minutes until every orange rots", i: "grid = [[2,1,1],[1,1,0],[0,1,1]]", o: "4", e: "Multi-source BFS spreads rot level by level." },
      { t: "Implement Stack Using Queues", d: "implement a LIFO stack using queues", i: "push(1), push(2), pop()", o: "2", e: "The queue is rotated so the newest element sits in front." },
      { t: "Interleave Queue Halves", d: "interleave the first and second halves of a queue", i: "[11,12,13,14,15,16]", o: "[11,14,12,15,13,16]", e: "A stack reverses the first half before interleaving." },
      { t: "Task Scheduler", d: "find the least time to finish tasks with a cooldown", i: "tasks = [A,A,A,B,B,B], n = 2", o: "8", e: "Idle slots fill the cooldown between identical tasks." },
      { t: "LRU Cache", d: "design a least recently used cache", i: "put(1,1), put(2,2), get(1), put(3,3)", o: "1", e: "A queue-like ordered map evicts the least recently used key." },
      { t: "Petrol Pump Circular Tour", d: "find the starting pump for a complete circular tour", i: "pumps = [[4,6],[6,5],[7,3],[4,5]]", o: "1", e: "A running deficit resets the candidate start." },
      { t: "Queue Reconstruction by Height", d: "reconstruct a queue from height and count pairs", i: "[[7,0],[4,4],[7,1]]", o: "[[7,0],[7,1],[4,4]]", e: "Taller people are placed first at their index." },
      { t: "Number of Recent Calls", d: "count requests received in the last 3000 milliseconds", i: "ping(1), ping(100), ping(3001)", o: "3", e: "Old timestamps are dequeued from the front." },
      { t: "Shortest Path in Binary Maze", d: "find the shortest path in a binary maze using BFS", i: "grid 3x3 with clear path", o: "4", e: "BFS visits cells in increasing distance order." },
      { t: "Priority Queue Scheduling", d: "process jobs by priority and report the finish order", i: "jobs = [(A,2),(B,1),(C,3)]", o: "C A B", e: "The highest priority job is always dequeued first." }
    ],
    "Trees": [
      { t: "Inorder Traversal", d: "return the inorder traversal of a binary tree", i: "root = [1,null,2,3]", o: "[1,3,2]", e: "Left subtree, node, right subtree order is followed." },
      { t: "Maximum Depth", d: "find the maximum depth of a binary tree", i: "root = [3,9,20,null,null,15,7]", o: "3", e: "The deepest path passes through 20 and 15." },
      { t: "Validate BST", d: "check whether a binary tree is a valid binary search tree", i: "root = [2,1,3]", o: "true", e: "Every node stays within its allowed value range." },
      { t: "Level Order Traversal", d: "return the level order traversal of a binary tree", i: "root = [3,9,20,null,null,15,7]", o: "[[3],[9,20],[15,7]]", e: "BFS collects nodes level by level." },
      { t: "Lowest Common Ancestor", d: "find the lowest common ancestor of two nodes", i: "root = [3,5,1], p = 5, q = 1", o: "3", e: "The split point of the two search paths is the answer." },
      { t: "Diameter of Binary Tree", d: "compute the diameter of a binary tree", i: "root = [1,2,3,4,5]", o: "3", e: "The longest path runs 4-2-1-3." },
      { t: "Symmetric Tree", d: "check whether a binary tree is a mirror of itself", i: "root = [1,2,2,3,4,4,3]", o: "true", e: "Left and right subtrees mirror each other." },
      { t: "Right Side View", d: "return the values visible from the right side of the tree", i: "root = [1,2,3,null,5]", o: "[1,3,5]", e: "The last node of each level is collected." },
      { t: "Path Sum Count", d: "count downward paths summing to a target", i: "root = [10,5,-3], target = 8", o: "3", e: "Prefix sums along the root path count matching segments." },
      { t: "Serialize and Deserialize Tree", d: "serialize a binary tree to a string and rebuild it", i: "root = [1,2,3,null,null,4,5]", o: "1,2,#,#,3,4,#", e: "Preorder with null markers is reversible." },
      { t: "Build Tree from Traversals", d: "construct a binary tree from preorder and inorder traversals", i: "pre = [3,9,20], in = [9,3,20]", o: "[3,9,20]", e: "The preorder head splits the inorder array." },
      { t: "Kth Smallest in BST", d: "find the kth smallest element in a BST", i: "root = [3,1,4,null,2], k = 1", o: "1", e: "Inorder traversal visits values in ascending order." },
      { t: "Balanced Binary Tree", d: "check whether the tree is height balanced", i: "root = [3,9,20,null,null,15,7]", o: "true", e: "No subtree pair differs in height by more than one." },
      { t: "Vertical Order Traversal", d: "return the vertical order traversal of a binary tree", i: "root = [3,9,20,null,null,15,7]", o: "[[9],[3,15],[20],[7]]", e: "Nodes are grouped by horizontal distance." }
    ],
    "Graphs": [
      { t: "Number of Islands", d: "count the connected islands in a grid", i: "grid = [[1,1,0],[0,1,0],[0,0,1]]", o: "2", e: "Flood fill marks each connected component once." },
      { t: "Course Schedule", d: "determine whether all courses can be finished given prerequisites", i: "n = 2, prereq = [[1,0]]", o: "true", e: "The prerequisite graph has no cycle." },
      { t: "Clone Graph", d: "deep copy a connected undirected graph", i: "adj = [[2],[1]]", o: "[[2],[1]]", e: "A visited map prevents infinite recursion." },
      { t: "Shortest Path Unweighted", d: "find the shortest path length between two nodes", i: "edges = [[0,1],[1,2]], src = 0, dst = 2", o: "2", e: "BFS gives the minimum edge count." },
      { t: "Dijkstra Shortest Path", d: "compute shortest distances from a source in a weighted graph", i: "edges = [[0,1,4],[0,2,1],[2,1,2]], src = 0", o: "[0,3,1]", e: "The path 0-2-1 costs 3 which beats the direct edge." },
      { t: "Detect Cycle in Directed Graph", d: "detect a cycle in a directed graph", i: "edges = [[0,1],[1,2],[2,0]]", o: "true", e: "A back edge to a node on the recursion stack proves a cycle." },
      { t: "Topological Sort", d: "return a valid topological ordering of the graph", i: "edges = [[5,2],[5,0],[4,0]]", o: "[5,4,2,0]", e: "Nodes with zero indegree are emitted first." },
      { t: "Bipartite Check", d: "check whether the graph can be two-coloured", i: "adj = [[1,3],[0,2],[1,3],[0,2]]", o: "true", e: "BFS colours alternate levels without conflict." },
      { t: "Minimum Spanning Tree", d: "find the weight of a minimum spanning tree", i: "edges = [[0,1,1],[1,2,2],[0,2,3]]", o: "3", e: "Kruskal picks the two cheapest non-cyclic edges." },
      { t: "Word Ladder", d: "find the shortest transformation sequence length between two words", i: "begin = hit, end = cog, list = [hot,dot,dog,cog]", o: "5", e: "BFS over one-letter mutations finds the shortest chain." },
      { t: "Connected Components", d: "count connected components in an undirected graph", i: "n = 5, edges = [[0,1],[3,4]]", o: "3", e: "Union-Find merges nodes and counts remaining roots." },
      { t: "Flood Fill", d: "perform a flood fill on an image grid", i: "image = [[1,1,1],[1,1,0]], sr=1, sc=1, color=2", o: "[[2,2,2],[2,2,0]]", e: "All 4-directionally connected same-colour pixels change." },
      { t: "Bridges in Graph", d: "find all bridge edges in an undirected graph", i: "edges = [[0,1],[1,2],[2,0],[1,3]]", o: "[[1,3]]", e: "Removing edge 1-3 disconnects the graph." },
      { t: "Cheapest Flights Within K Stops", d: "find the cheapest route with at most k stops", i: "n=3, flights=[[0,1,100],[1,2,100],[0,2,500]], k=1", o: "200", e: "Two hops cost less than the direct flight." }
    ],
    "Recursion": [
      { t: "Factorial", d: "compute the factorial of n recursively", i: "n = 5", o: "120", e: "5 * 4 * 3 * 2 * 1 equals 120." },
      { t: "Fibonacci Number", d: "return the nth Fibonacci number", i: "n = 7", o: "13", e: "The sequence 0,1,1,2,3,5,8,13 gives 13 at index 7." },
      { t: "Tower of Hanoi", d: "print the minimum moves to solve Tower of Hanoi", i: "n = 3", o: "7", e: "Solving n discs needs 2^n - 1 moves." },
      { t: "Generate Subsets", d: "generate all subsets of a set", i: "nums = [1,2]", o: "[[],[1],[2],[1,2]]", e: "Each element is either included or excluded." },
      { t: "Permutations", d: "generate all permutations of the array", i: "nums = [1,2,3]", o: "6 permutations", e: "Each position is swapped with every remaining element." },
      { t: "N-Queens", d: "count the ways to place n non-attacking queens", i: "n = 4", o: "2", e: "Backtracking prunes conflicting columns and diagonals." },
      { t: "Rat in a Maze", d: "count paths from the top-left to the bottom-right of a maze", i: "maze 3x3 fully open", o: "6", e: "Each path moves only right or down." },
      { t: "Sudoku Solver", d: "solve a partially filled Sudoku board", i: "standard 9x9 puzzle", o: "solved board", e: "Backtracking tries digits and reverts invalid placements." },
      { t: "Word Search in Grid", d: "check whether a word exists in the character grid", i: "board 3x4, word = \"ABCCED\"", o: "true", e: "DFS explores neighbours and backtracks on failure." },
      { t: "Combination Sum", d: "find all combinations summing to a target with reuse allowed", i: "candidates = [2,3,6,7], target = 7", o: "[[2,2,3],[7]]", e: "Each candidate may be reused at the same recursion depth." },
      { t: "Print All Paths in Matrix", d: "print all paths from the first to the last cell of a matrix", i: "m = 2, n = 2", o: "2", e: "Right-Down and Down-Right are the only paths." },
      { t: "Power Function", d: "compute x raised to n using fast exponentiation", i: "x = 2, n = 10", o: "1024", e: "Squaring halves the exponent at each step." },
      { t: "Palindrome Partitioning", d: "partition a string so every part is a palindrome", i: "s = \"aab\"", o: "[[a,a,b],[aa,b]]", e: "Each prefix is checked before recursing on the rest." },
      { t: "Josephus Problem", d: "find the survivor position in the Josephus elimination", i: "n = 7, k = 3", o: "4", e: "The recurrence shifts the survivor index by k each round." }
    ],
    "Searching": [
      { t: "Binary Search", d: "search a sorted array for a target value", i: "nums = [-1,0,3,5,9], target = 9", o: "4", e: "The search space halves until the target is located." },
      { t: "First and Last Position", d: "find the first and last index of a target in a sorted array", i: "nums = [5,7,7,8,8,10], target = 8", o: "[3,4]", e: "Two modified binary searches locate the boundaries." },
      { t: "Search in Rotated Array", d: "search a target in a rotated sorted array", i: "nums = [4,5,6,7,0,1,2], target = 0", o: "4", e: "One half is always sorted which guides the search." },
      { t: "Peak Element", d: "find a peak element index in the array", i: "nums = [1,2,3,1]", o: "2", e: "The slope direction indicates where a peak must exist." },
      { t: "Square Root by Binary Search", d: "compute the integer square root of a number", i: "x = 8", o: "2", e: "The largest value whose square is at most 8 is 2." },
      { t: "Median of Two Sorted Arrays", d: "find the median of two sorted arrays", i: "a = [1,3], b = [2]", o: "2", e: "The merged array [1,2,3] has median 2." },
      { t: "Allocate Minimum Pages", d: "minimise the maximum pages assigned to a student", i: "books = [12,34,67,90], k = 2", o: "113", e: "Binary search on the answer validates each split." },
      { t: "Aggressive Cows", d: "place cows so the minimum distance is maximised", i: "stalls = [1,2,4,8,9], cows = 3", o: "3", e: "Binary search on distance checks feasibility greedily." },
      { t: "Search 2D Matrix", d: "search a value in a row-wise and column-wise sorted matrix", i: "matrix 3x4, target = 3", o: "true", e: "The staircase search starts at the top-right corner." },
      { t: "Ternary Search Maximum", d: "find the maximum of a unimodal function", i: "f(x) = -(x-3)^2", o: "3", e: "The interval shrinks around the peak." },
      { t: "Count Occurrences", d: "count occurrences of a value in a sorted array", i: "nums = [1,2,2,2,3], target = 2", o: "3", e: "Upper bound minus lower bound gives the count." },
      { t: "Minimum in Rotated Array", d: "find the minimum element of a rotated sorted array", i: "nums = [3,4,5,1,2]", o: "1", e: "The inflection point holds the minimum." },
      { t: "Kth Element of Two Arrays", d: "find the kth element of two sorted arrays", i: "a = [2,3,6], b = [1,4,5], k = 4", o: "4", e: "Partition search splits both arrays at the right point." },
      { t: "Capacity to Ship Packages", d: "find the least ship capacity to move all packages in d days", i: "weights = [1,2,3,4,5], days = 3", o: "6", e: "Binary search on capacity checks the day count." }
    ],
    "Sorting": [
      { t: "Bubble Sort Implementation", d: "sort an array using bubble sort and report the swap count", i: "nums = [5,1,4,2]", o: "[1,2,4,5]", e: "Adjacent pairs are swapped until no swaps remain." },
      { t: "Merge Sort", d: "sort an array using merge sort", i: "nums = [38,27,43,3]", o: "[3,27,38,43]", e: "Halves are sorted recursively and merged." },
      { t: "Quick Sort Partition", d: "sort an array using quick sort", i: "nums = [10,7,8,9,1]", o: "[1,7,8,9,10]", e: "The pivot partitions elements into two sides." },
      { t: "Count Inversions", d: "count inversions in the array", i: "nums = [2,4,1,3,5]", o: "3", e: "Merge sort counts cross-pair inversions while merging." },
      { t: "Sort Colours", d: "sort an array of three distinct colour values", i: "nums = [2,0,1]", o: "[0,1,2]", e: "One pass with three pointers is enough." },
      { t: "Meeting Rooms", d: "find the minimum number of meeting rooms required", i: "intervals = [[0,30],[5,10],[15,20]]", o: "2", e: "Sorted start and end times reveal the peak overlap." },
      { t: "Merge Intervals", d: "merge all overlapping intervals", i: "intervals = [[1,3],[2,6],[8,10]]", o: "[[1,6],[8,10]]", e: "Sorted intervals are merged when they touch." },
      { t: "Custom Comparator Sort", d: "sort strings by length then lexicographically", i: "words = [\"bb\",\"a\",\"ccc\"]", o: "[a,bb,ccc]", e: "A comparator applies length first and value second." },
      { t: "Largest Number from Array", d: "arrange numbers to form the largest possible number", i: "nums = [3,30,34,5,9]", o: "9534330", e: "Concatenation comparison drives the sort order." },
      { t: "Heap Sort", d: "sort an array using heap sort", i: "nums = [4,10,3,5]", o: "[3,4,5,10]", e: "A max heap is built and the root is repeatedly extracted." },
      { t: "Kth Closest Points", d: "find the k closest points to the origin", i: "points = [[1,3],[-2,2]], k = 1", o: "[[-2,2]]", e: "Squared distance ordering avoids square roots." },
      { t: "Wiggle Sort", d: "reorder the array into a wiggle sequence", i: "nums = [3,5,2,1]", o: "[3,5,1,2]", e: "Alternate positions hold larger and smaller values." },
      { t: "Sort Nearly Sorted Array", d: "sort an array where every element is at most k positions away", i: "nums = [6,5,3,2,8], k = 3", o: "[2,3,5,6,8]", e: "A min heap of size k+1 emits the next smallest value." },
      { t: "Bucket Sort Frequencies", d: "sort elements by decreasing frequency", i: "nums = [1,1,2,2,2,3]", o: "[2,2,2,1,1,3]", e: "Counts are bucketed and read back in order." }
    ],
    "Dynamic Programming": [
      { t: "Climbing Stairs", d: "count the ways to climb n stairs taking one or two steps", i: "n = 5", o: "8", e: "The count follows the Fibonacci recurrence." },
      { t: "0/1 Knapsack", d: "maximise value within a weight capacity", i: "w = [1,3,4], v = [15,20,30], cap = 4", o: "45", e: "Items 1 and 3 fit exactly and give the best value." },
      { t: "Longest Increasing Subsequence", d: "find the length of the longest increasing subsequence", i: "nums = [10,9,2,5,3,7]", o: "3", e: "The subsequence 2,3,7 has length 3." },
      { t: "Coin Change", d: "find the fewest coins needed to make an amount", i: "coins = [1,2,5], amount = 11", o: "3", e: "5 + 5 + 1 uses three coins." },
      { t: "Edit Distance", d: "compute the minimum edit distance between two words", i: "a = horse, b = ros", o: "3", e: "Three operations convert horse into ros." },
      { t: "Longest Common Subsequence", d: "find the length of the longest common subsequence", i: "a = abcde, b = ace", o: "3", e: "\"ace\" appears in both strings in order." },
      { t: "House Robber", d: "maximise loot without robbing adjacent houses", i: "nums = [2,7,9,3,1]", o: "12", e: "Robbing houses 1, 3 and 5 gives 12." },
      { t: "Matrix Chain Multiplication", d: "find the minimum multiplications to chain matrices", i: "dims = [10,20,30,40]", o: "18000", e: "The optimal split minimises scalar multiplications." },
      { t: "Partition Equal Subset Sum", d: "check whether the array can be split into two equal-sum subsets", i: "nums = [1,5,11,5]", o: "true", e: "Both parts sum to 11." },
      { t: "Unique Paths", d: "count unique paths in an m by n grid", i: "m = 3, n = 3", o: "6", e: "Each cell sums the paths from above and from the left." },
      { t: "Word Break", d: "check whether the string can be segmented into dictionary words", i: "s = applepen, dict = [apple,pen]", o: "true", e: "The string splits cleanly into two dictionary words." },
      { t: "Egg Dropping", d: "find the minimum trials needed in the worst case", i: "eggs = 2, floors = 10", o: "4", e: "The optimal first drop balances both outcomes." },
      { t: "Maximum Product Subarray", d: "find the maximum product of a contiguous subarray", i: "nums = [2,3,-2,4]", o: "6", e: "The subarray [2,3] gives the maximum product." },
      { t: "Palindromic Subsequence", d: "find the length of the longest palindromic subsequence", i: "s = bbbab", o: "4", e: "\"bbbb\" is the longest palindromic subsequence." }
    ],
    "Greedy Algorithms": [
      { t: "Activity Selection", d: "select the maximum number of non-overlapping activities", i: "start = [1,3,0], end = [2,4,6]", o: "2", e: "Choosing the earliest finishing activities is optimal." },
      { t: "Fractional Knapsack", d: "maximise value allowing fractional items", i: "w = [10,20], v = [60,100], cap = 25", o: "135", e: "Items are taken by decreasing value per unit weight." },
      { t: "Minimum Platforms", d: "find the minimum railway platforms required", i: "arr = [900,940,950], dep = [910,1200,1120]", o: "2", e: "Two trains overlap at the peak moment." },
      { t: "Job Sequencing with Deadlines", d: "maximise profit scheduling jobs before deadlines", i: "jobs = [(a,2,100),(b,1,19)]", o: "119", e: "Jobs are placed in the latest free slot before their deadline." },
      { t: "Huffman Encoding", d: "compute the minimum cost of Huffman encoding", i: "freq = [5,9,12,13]", o: "79", e: "The two smallest frequencies are merged repeatedly." },
      { t: "Gas Station Circuit", d: "find the starting gas station to complete the circuit", i: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", o: "3", e: "The tank never drops below zero starting at index 3." },
      { t: "Minimum Coins Greedy", d: "find the minimum coins for an amount with a canonical coin system", i: "amount = 93", o: "5", e: "Largest denominations are used first." },
      { t: "Candy Distribution", d: "distribute candies so higher-rated neighbours get more", i: "ratings = [1,0,2]", o: "5", e: "Two passes handle left and right constraints." },
      { t: "Non-overlapping Intervals", d: "remove the fewest intervals so none overlap", i: "intervals = [[1,2],[2,3],[1,3]]", o: "1", e: "Removing [1,3] resolves the conflict." },
      { t: "Jump Game", d: "check whether the last index is reachable", i: "nums = [2,3,1,1,4]", o: "true", e: "The furthest reachable index always stays ahead." },
      { t: "Minimum Cost to Connect Ropes", d: "connect ropes with minimum total cost", i: "ropes = [4,3,2,6]", o: "29", e: "The two shortest ropes are joined at each step." },
      { t: "Assign Cookies", d: "maximise the number of satisfied children", i: "greed = [1,2,3], sizes = [1,1]", o: "1", e: "The smallest sufficient cookie serves the least greedy child." },
      { t: "Shortest Job First", d: "compute the average waiting time under SJF scheduling", i: "burst = [6,8,7,3]", o: "7", e: "Shorter jobs run first to reduce waiting." },
      { t: "Partition Labels", d: "split the string into as many parts as possible with unique letters", i: "s = ababcbacadefegde", o: "[9,7]", e: "Each part ends at the last occurrence of its letters." }
    ]
  };

  var TOPICS = Object.keys(BASE);

  var VARIANTS = {
    Easy: { suffix: "", n: "10^3", time: 15, note: "Focus on a clean, readable brute-force or single-pass solution." },
    Medium: { suffix: "II", n: "10^5", time: 25, note: "An optimal linear or logarithmic approach is expected." },
    Hard: { suffix: "III", n: "10^6", time: 40, note: "Tight limits demand the optimal algorithm and careful edge handling." }
  };

  var COMPANIES = ["TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "Deloitte"];

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  var PROBLEMS = [];
  TOPICS.forEach(function (topic) {
    BASE[topic].forEach(function (b, bi) {
      LEVELS.forEach(function (lvl, li) {
        var v = VARIANTS[lvl];
        var id = topic.toLowerCase().replace(/[^a-z]+/g, "-") + "-" + (bi + 1) + "-" + lvl.toLowerCase();
        var h = hash(id);
        var title = b.t + (v.suffix ? " " + v.suffix : "");
        var companies = [COMPANIES[h % COMPANIES.length]];
        if (li >= 1) companies.push(COMPANIES[(h >> 3) % COMPANIES.length]);
        if (li === 2) companies.push(COMPANIES[(h >> 6) % COMPANIES.length]);
        companies = companies.filter(function (c, k) { return companies.indexOf(c) === k; });
        PROBLEMS.push({
          id: id,
          title: title,
          topic: topic,
          difficulty: lvl,
          acceptance: 40 + (h % 45) - li * 8,
          minutes: v.time,
          companies: companies,
          statement: "Given the input described below, " + b.d + ".\n\n" +
            "This is the " + lvl.toLowerCase() + " tier of the " + b.t + " challenge from the " + topic +
            " track. " + v.note,
          constraints: [
            "1 <= n <= " + v.n,
            "All input values fit in a 32-bit signed integer",
            "Expected time limit: " + (li === 0 ? "1" : li === 1 ? "2" : "3") + " second(s) per test file",
            li === 2 ? "Your solution must handle the maximum constraints without extra memory beyond O(n)" : "Extra space up to O(n) is allowed"
          ],
          sampleInput: b.i,
          sampleOutput: b.o,
          explanation: b.e,
          tests: [
            { input: b.i, output: b.o },
            { input: "Edge case: smallest valid input", output: "Handle gracefully without crashing" },
            { input: "Stress case: n at the upper constraint", output: "Must finish within the time limit" }
          ],
          hint: "Think about the standard " + topic + " pattern used for " + b.t.toLowerCase() + " style problems."
        });
      });
    });
  });

  window.PrepDeckCodingBank = {
    topics: TOPICS,
    levels: LEVELS,
    companies: COMPANIES,
    problems: PROBLEMS
  };
})();