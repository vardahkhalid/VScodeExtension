#include <iostream>
#include <unordered_set>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;  // Read the size of the array
    vector<int> nums(n);
    for (int i = 0; i < n; ++i) {
        cin >> nums[i];  
        //cout<<nums[i]<<" ";// Read the elements of the array
    }

    // Step 2: Use a set to track numbers we've seen before
    unordered_set<int> seen;
    for (int i = 0; i < n; ++i) {
        if (seen.find(nums[i]) != seen.end()) {
            // Duplicate found
            cout<<nums[i] << endl;
            return 0;  // Exit after finding the first duplicate
        }
        seen.insert(nums[i]);
    }

    cout << -1 << endl;
    return 0;
}
