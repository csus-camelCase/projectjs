from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

driver = webdriver.Chrome()

try:
     # Open login page
    driver.get("http://localhost:3001")  # Change URL to match your server

    sign_up = driver.find_element(By.LINK_TEXT, "Sign-Up")
    sign_up.click()
    
    time.sleep(2)  

    def clear_form():
        for field in ["first_name", "last_name", "username", "email", "password", "confirm_password"]:
            driver.find_element(By.NAME, field).clear()

    # Test 1: missing input field
    def test_empty_input():
        clear_form()
        driver.find_element(By.NAME, "first_name").send_keys("")
        driver.find_element(By.NAME, "last_name").send_keys("Smith")
        driver.find_element(By.NAME, "username").send_keys("BobSmith123")
        driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
        driver.find_element(By.NAME, "password").send_keys("StrongPassword123!")
        driver.find_element(By.NAME, "confirm_password").send_keys("StrongPassword123!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        # Check for error messages
        empty_input_errors = driver.find_elements(By.CSS_SELECTOR, "input:invalid")
        if empty_input_errors:
            print("Empty Input Test: Pass")
        else:
            print("Empty Input Test: Fail")

    # Test 2: Weak password entered
    def test_weak_password():
        clear_form()
        driver.find_element(By.NAME, "first_name").send_keys("Bob")
        driver.find_element(By.NAME, "last_name").send_keys("Smith")
        driver.find_element(By.NAME, "username").send_keys("BobSmith123")
        driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
        driver.find_element(By.NAME, "password").send_keys("weakpass")
        driver.find_element(By.NAME, "confirm_password").send_keys("weakpass")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        try:
            weak_password_error = WebDriverWait(driver, 10).until(
                EC.text_to_be_present_in_element((By.ID, "passwordError"), "Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.")
            )
            print("Test Passed: Weak password validation works.")
        except:
            print("Test Failed: Weak password validation missing.")

    # Test 3: non-matching passwords
    def test_non_matching_passwords():
        clear_form()
        driver.find_element(By.NAME, "first_name").send_keys("Bob")
        driver.find_element(By.NAME, "last_name").send_keys("Smith")
        driver.find_element(By.NAME, "username").send_keys("BobSmith123")
        driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
        driver.find_element(By.NAME, "password").send_keys("StrongPassword123!")
        driver.find_element(By.NAME, "confirm_password").send_keys("StrongPassword12!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        # Check for error messages
        try:
            match_error_element = WebDriverWait(driver, 10).until(
                EC.text_to_be_present_in_element((By.ID, "matchError"), "Passwords do not match.")
            )
            print("Test Passed: Match error displayed correctly.")
        except:
            print("Test Failed: Match error not displayed or incorrect.")

    # Test 4: User already exists (email already registered)
    def test_existing_user():
        clear_form()
        driver.find_element(By.NAME, "first_name").send_keys("Alice")
        driver.find_element(By.NAME, "last_name").send_keys("Brown")
        driver.find_element(By.NAME, "username").send_keys("AliceBrown123")
        driver.find_element(By.NAME, "email").send_keys("testemail123@gmail.com")  # Using existing email
        driver.find_element(By.NAME, "password").send_keys("ValidPass123!")
        driver.find_element(By.NAME, "confirm_password").send_keys("ValidPass123!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        try:
            user_exists_error = WebDriverWait(driver, 10).until(
                EC.text_to_be_present_in_element((By.ID, "userExistsError"), "User with this email already exists.")
            )
            print("Test Passed: Existing user validation works.")
        except:
            print("Test Failed: Existing user validation missing.")

# Executing tests
    test_empty_input()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)

    test_weak_password()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)

    test_non_matching_passwords()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)

    test_existing_user()
    time.sleep(2)
    driver.refresh()
    time.sleep(2)

    driver.find_element(By.NAME, "first_name").send_keys("Bob")
    driver.find_element(By.NAME, "last_name").send_keys("Smith")
    driver.find_element(By.NAME, "username").send_keys("BobSmith123")
    driver.find_element(By.NAME, "email").send_keys("bob.smith@example.com")
    driver.find_element(By.NAME, "password").send_keys("StrongPassword123!")
    driver.find_element(By.NAME, "confirm_password").send_keys("StrongPassword123!")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    time.sleep(2)  

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("bob.smith@example.com")
    password_input.send_keys("StrongPassword123!")
    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(2)  

    #Open dropdown menu
    menu_button = driver.find_element(By.XPATH, "//div[@class='dropdown']/button")
    ActionChains(driver).move_to_element(menu_button).click().perform()

    time.sleep(2)

    #Click "Settings" link
    settings_link = driver.find_element(By.LINK_TEXT, "Settings")
    settings_link.click()
    time.sleep(2)
    #Click account deletion button
    delete_button = driver.find_element(By.CLASS_NAME, "delete-btn")
    delete_button.click()

    time.sleep(2)   

    #Click OK option in pop-up alert
    alert = driver.switch_to.alert
    alert.accept()   

    time.sleep(2)   

    #Verify if failed or passed
    assert "index.html" in driver.current_url, "Account deletion failed!"

    print("Account deletion test passed!")

    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("bob.smith@example.com")
    password_input.send_keys("StrongPassword123!")
    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    email_input = driver.find_element(By.NAME, "email")

except Exception as e:
    print(f"Test failed: {e}")

finally:
    # Close the browser
    driver.quit()