from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.alert import Alert
import time

driver = webdriver.Chrome()
invalidTest = "sys1thebest"
validTest = "Sys1thebest*"

def test_password(password, confirm_password, expected_error):
    try:
        driver.get("http://localhost:3001")

        # Navigate to signup page
        sign_up_link = driver.find_element(By.LINK_TEXT, "Sign-Up")
        sign_up_link.click()
        time.sleep(2)

        # Define input boxes and fill out the form
        driver.find_element(By.NAME, "first_name").send_keys("Joe")
        driver.find_element(By.NAME, "last_name").send_keys("Burner")
        driver.find_element(By.NAME, "username").send_keys("jb")
        driver.find_element(By.NAME, "email").send_keys("example@email.com")
        driver.find_element(By.NAME, "password").send_keys(password)
        driver.find_element(By.NAME, "confirm_password").send_keys(confirm_password)

        # Submit the form
        driver.find_element(By.CLASS_NAME, "btn").click()
        time.sleep(2)

        # Check for expected error message
        if expected_error:
            error_message = driver.find_element(By.ID, "passwordError").text
            if expected_error in error_message:
                print("Test case passed: Password validation failed as expected.")
            else:
                print("Test case failed: Expected validation error not found.")
        else:
            # If no error expected, check for redirect (assuming successful login)
            if "index.html" in driver.current_url:
                print("Test case passed: Valid password accepted.")
            else:
                print("Test case failed: Valid password was not accepted.")
    except Exception as e:
        print(f"Test encountered an error: {e}")

# Run test cases
test_password(invalidTest, invalidTest, "Password must be at least 8 characters long")  # Should fail

driver.quit()