from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time

# Setup WebDriver (with ChromeDriver)
driver = webdriver.Chrome()

# Define the URL of the login page
url = "http://localhost:3001"  # Replace with your actual local or deployed URL

def login_test(email, password):
    driver.get(url)  # Open the login page

    # Find the email and password input fields
    email_field = driver.find_element(By.ID, 'email')
    password_field = driver.find_element(By.ID, 'password')

    # Clear any previous text in the fields and enter the test credentials
    email_field.clear()
    email_field.send_keys(email)
    password_field.clear()
    password_field.send_keys(password)

    # Submit the form
    password_field.send_keys(Keys.RETURN)  # Simulate pressing Enter key

    # Wait for page load or an error message
    time.sleep(3)  # Adjust sleep time as needed for the page to load or error to appear

    # Check if login was successful or if the error message appears
    try:
        error_message = driver.find_element(By.XPATH, "//span[contains(text(), 'Invalid email or password')]")
        print(f"Login with email {email} and password {password} failed: Error message shown.")
    except:
        print(f"Login with email {email} and password {password} was successful or no error message displayed.")

def remember_me_test(email, password, remember_me=True):
    driver.get(url)  # Open the login page

    # Find the email, password input fields, and Remember Me checkbox
    email_field = driver.find_element(By.ID, 'email')
    password_field = driver.find_element(By.ID, 'password')
    remember_me_checkbox = driver.find_element(By.ID, 'rememberMe')

    # Clear any previous text in the fields and enter the test credentials
    email_field.clear()
    email_field.send_keys(email)
    password_field.clear()
    password_field.send_keys(password)

    # Check "Remember Me" checkbox if specified
    if remember_me:
        remember_me_checkbox.click()

    # Submit the form
    password_field.send_keys(Keys.RETURN)  # Simulate pressing Enter key

    # Wait for page load or an error message
    time.sleep(3)  # Adjust sleep time as needed for the page to load or error to appear

    # Check if login was successful or if the error message appears
    try:
        error_message = driver.find_element(By.XPATH, "//span[contains(text(), 'Invalid email or password')]")
        print(f"Login with email {email} and password {password} failed: Error message shown.")
    except:
        print(f"Login with email {email} and password {password} was successful or no error message displayed.")

    # Log out by clicking the logout button in the dropdown menu
    try:
        dropdown_menu = driver.find_element(By.CLASS_NAME, 'dropdown')  # Adjust the ID of the dropdown menu if needed
        dropdown_menu.click()

        logout_button = driver.find_element(By.XPATH, "//a[text()='Logout']")  # Adjust the XPath to match the logout button
        logout_button.click()
        time.sleep(2)  # Wait for logout to complete
        print("Logged out successfully.")
    except Exception as e:
        print(f"Logout failed: {e}")

    # Open the login page again and check if the email is pre-filled
    driver.get(url)
    time.sleep(2)  # Wait for the login page to load

    # Check if the email field contains the correct email after logging out and coming back
    email_field = driver.find_element(By.ID, 'email')
    field_value = email_field.get_attribute('value')
    if field_value == email:
        print(f"Email field correctly retains the email: {field_value}")
    else:
        print(f"Email field does not retain the email. Found: {field_value}")
    
def run_tests():
    # Test with correct credentials
    print("Running test with correct credentials:")
    login_test('tktkuti12@gmail.com', 'Password')

    # Test with incorrect credentials
    print("\nRunning test with incorrect credentials:")
    login_test('tktkuti12@gmail.com', 'WrongPassword')

    #Remember me test
    print("\nRunning 'Remember Me' test:")
    remember_me_test('tktkuti12@gmail.com', 'Password', remember_me=True)

# Run the tests
run_tests()

# Close the browser after the tests are done
driver.quit()
