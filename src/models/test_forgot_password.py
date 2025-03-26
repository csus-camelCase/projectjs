from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")  # Change URL to match your server
    
    time.sleep(2)

    # Click on "forgot password" link
    forgot = driver.find_element(By.NAME, "forgot")
    forgot.click()

    time.sleep(2)

    # Type in email
    email_input = driver.find_element(By.ID, "email")
    email_input.send_keys("admin@email.com")
    email_input.send_keys(Keys.RETURN)

    time.sleep(2)

    # Print result from alert text
    print(f"Result: {driver.switch_to.alert.text}")

finally:
    # Close the browser
    driver.quit()