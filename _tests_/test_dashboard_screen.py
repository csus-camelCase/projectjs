from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.alert import Alert
import time

driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")  # Change URL to match your server

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    #email_input.send_keys("kennyahn@email.com")
    #password_input.send_keys("password")

    email_input.send_keys("sewey@gmail.com")
    password_input.send_keys("Testing1234!")

    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(2)

    #press acc pref button
    button = driver.find_element(By.XPATH, "//button[text()='Edit Account Preferences']")
    button.click()

    time.sleep(2)

    print("Dashboard screening test passed!")

except Exception as e:
    print(f"Test failed: {e}")

finally:
    # Close the browser
    driver.quit()