The Plan
Remove Mock Data for Parts:

File: src/data/mockData.ts
Description: Remove the parts array, globalParts array, and the functions addPartToCatalog, updatePartPricing, and getGlobalParts. These will no longer be needed as data will be managed by Supabase.
Fetch Parts from Supabase:

File: src/components/Parts.tsx
Description:
Import supabase from ../lib/supabase.
Introduce useState hooks for parts (initialized as an empty array), isLoading (initialized to true), and error (initialized to null).
Create an asynchronous function, fetchParts, that will:
Set isLoading to true.
Use supabase.from('parts').select('*, price_history:part_price_history(*)') to fetch parts and their associated price history.
Map the fetched Supabase data (e.g., part_number to partNumber, current_stock to currentStock, and transform the price_history array to match your PriceHistory interface) to your Part interface.
Update the parts state with the transformed data.
Set isLoading to false.
Handle any potential errors during the fetch operation and set the error state.
Call fetchParts inside a useEffect hook with an empty dependency array ([]) to ensure it runs once when the component mounts.
Update the filteredParts logic to use the parts state fetched from Supabase.
Modify the UI to display a loading indicator when isLoading is true and an error message if error is present.
Update handlePartAdded and handlePartUpdated callbacks to trigger a re-fetch of parts by calling fetchParts().
Implement Add Part to Supabase:

File: src/components/AddPart.tsx
Description:
Import supabase from ../lib/supabase and useAuth from ../contexts/AuthContext.
Modify the handleSubmit function:
Set isSubmitting to true.
Construct the part object to be inserted into the parts table, ensuring column names match your Supabase schema (e.g., partNumber becomes part_number, minStock becomes min_stock, currentStock becomes current_stock, specifications is jsonb).
Use supabase.from('parts').insert([partObject]).select('id').single() to insert the new part and retrieve its ID.
If the part insertion is successful, construct an object for the part_price_history table using the initialPrice, supplier, and the newly created part_id.
Use supabase.from('part_price_history').insert([priceHistoryEntry]) to record the initial price.
Handle success and error scenarios.
After successful creation, call onPartAdded (which will trigger a re-fetch in Parts.tsx) and close the modal.
Set isSubmitting to false.
Remove the addPartToCatalog call.
Implement Edit Part in Supabase:

File: src/components/EditPart.tsx
Description:
Import supabase from ../lib/supabase and useAuth from ../contexts/AuthContext.
Modify the handleSubmit function:
Set isSubmitting to true.
Construct the updatedPartObject for the parts table, ensuring column names match Supabase.
Use supabase.from('parts').update(updatedPartObject).eq('id', part.id) to update the main part details.
If formData.newPrice is provided, construct a new entry for the part_price_history table, including part_id, price, supplier_name, effective_date, reason, and created_by (from useAuth().user.id).
Use supabase.from('part_price_history').insert([newPriceHistoryEntry]) to record the new price.
Handle success and error scenarios.
After successful update, call onPartUpdated (which will trigger a re-fetch in Parts.tsx) and close the modal.
Set isSubmitting to false.
Remove the updatePartPricing call.
Implement Delete Part from Supabase:

File: src/components/Parts.tsx
Description:
Add a new asynchronous function handleDeletePart that takes a partId as an argument.
Inside handleDeletePart, implement a confirmation dialog (e.g., using window.confirm).
If confirmed, use supabase.from('parts').delete().eq('id', partId) to delete the part.
Handle success and error scenarios.
After successful deletion, call fetchParts() to refresh the list.
Connect this handleDeletePart function to the "Delete Part" button in the UI.
Review and Adjust Types:

File: src/types/index.ts
Description: Review the Part and PriceHistory interfaces to ensure they accurately reflect the data structure returned by Supabase queries and expected by the components. Pay close attention to property names (e.g., part_number vs partNumber) and nested structures.