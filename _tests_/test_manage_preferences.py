from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

driver = webdriver.Chrome()
url = "http://localhost:3001"  

# Log in
def login():
    driver.get(url)

    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")

    email_input.send_keys("admin@email.com")
    password_input.send_keys("password")
    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(2)  

    #navigate to manage-preferences.ejs
    pref_button = driver.find_element(By.NAME, "preferences")
    pref_button.click()

# Function to test search functionality
def test_search_functionality(search_term): 
    login()

    # Find the search input field and enter the search term
    search_input = driver.find_element(By.ID, "searchInput")  
    search_input.clear()
    search_input.send_keys(search_term)

    time.sleep(2)  # Wait for the search results to load

    # Check if the search results are displayed correctly
    try:
        results = driver.find_elements(By.XPATH, f"//td[contains(text(), '{search_term}')]")
        if results:
            print(f"Search for '{search_term}' succeeded: Found results.")
        else:
            print(f"Search for '{search_term}' failed: No results found.")
    except Exception as e:
        print(f"Search failed: {e}")

# Function to test create preferences functionality
def test_create_preference(preference_name):
    login()

    # Find and click the 'Create Preference' button
    create_button = driver.find_element(By.ID, "createBtn")  
    create_button.click()

    time.sleep(1)  # Wait for the modal to open

    # Find the input field and enter a new preference
    preference_input = driver.find_element(By.ID, "preferenceInput")  
    preference_input.clear()
    preference_input.send_keys(preference_name)

    save_button = driver.find_element(By.ID, 'savePreferenceBtn')  
    save_button.click()

    time.sleep(2)  # Wait for the preference to be saved

    # Verify if the new preference is listed in the table
    try:
        preference_row = driver.find_element(By.XPATH, f"//tr[td[contains(text(), '{preference_name}')]]")
        print(f"Create preference '{preference_name}' succeeded: Found in the table.")
    except:
        print(f"Create preference '{preference_name}' failed: Not found in the table.")

# Function to test edit preferences functionality
def test_edit_preference(existing_preference, new_preference_name):
    login()

    time.sleep(2) #wait for table to load

    # Find the row with the existing preference
    preference_row = driver.find_element(By.XPATH, f"//tr[td[contains(text(), '{existing_preference}')]]")

    time.sleep(1)

    # Find and click the edit button for the preference
    edit_button = preference_row.find_element(By.XPATH, ".//button[@class='btn editBtn']")  
    edit_button.click()

    time.sleep(1)  # Wait for the modal to open

    # Find the input field and update the preference name
    preference_input = driver.find_element(By.ID, "preferenceInput")  # Adjust the ID if needed
    preference_input.clear()
    preference_input.send_keys(new_preference_name)

    save_button = driver.find_element(By.ID, "savePreferenceBtn")  # Adjust the ID if needed
    save_button.click()

    time.sleep(2)  # Wait for the preference to be saved

    # Verify if the updated preference is listed in the table
    try:
        preference_row = driver.find_element(By.XPATH, f"//tr[td[contains(text(), '{new_preference_name}')]]")
        print(f"Edit preference '{existing_preference}' to '{new_preference_name}' succeeded: Found in the table.")
    except:
        print(f"Edit preference '{existing_preference}' failed: Updated preference not found.")

# Function to test delete preferences functionality
def test_delete_preference(preference_name):
    login()

    time.sleep(3)

    # Find the row with the preference to delete
    preference_row = driver.find_element(By.XPATH, f"//tr[td[contains(text(), '{preference_name}')]]")

    time.sleep(2)

    # Find and select the checkbox for the preference to delete
    checkbox = preference_row.find_element(By.XPATH, ".//input[@type='checkbox']")
    checkbox.click()

    time.sleep(1)

    # Find and click the delete button for the preference
    delete_button = driver.find_element(By.ID, "deleteBtn")  # Adjust the button class if needed
    delete_button.click()

    time.sleep(1)  # Wait for the delete confirmation or process

    # Handle the confirmation pop-up (click "OK" on the first pop-up)
    driver.switch_to.alert.accept()

    time.sleep(1)

    # Handle the confirmation pop-up (click "OK" on the first pop-up)
    driver.switch_to.alert.accept()

    time.sleep(2)

    # Verify if the preference is no longer listed in the table
    try:
        preference_row = driver.find_element(By.XPATH, f"//tr[td[contains(text(), '{preference_name}')]]")
        print(f"Delete preference '{preference_name}' failed: Found in the table.")
    except:
        print(f"Delete preference '{preference_name}' succeeded: Not found in the table.")

# Running all tests
def run_tests():
    print("\nTesting Search Functionality:")
    test_search_functionality('Work From Home') 

    print("\nTesting Create Preference:")
    test_create_preference('New Preference')

    print("\nTesting Edit Preference:")
    test_edit_preference('New Preference', 'Updated Preference')

    print("\nTesting Delete Preference:")
    test_delete_preference('Updated Preference')

# Run the tests
run_tests()

# Close the browser after the tests are done
driver.quit()
