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
    
    email_input.send_keys("kennyahndelete@email.com")
    password_input.send_keys("Password98?")
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

except Exception as e:
    print(f"Test failed: {e}")

finally:
    # Close the browser
    driver.quit()