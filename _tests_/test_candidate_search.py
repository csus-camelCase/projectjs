from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


testers = ["Zachary","Estelita","rammerha1mmer@sbcglobal.net","Zachary Estelita"
           ,"Zacharyfail","Estelitafail","rammerha1mmerfail@sbcglobal.net", "Zachary EstelitaFail"
           ,"Tom","Bolyard","Tombolyard05@gmail.com","Tom Bolyard"]

driver = webdriver.Chrome()

try:
    # Open login page
    driver.get("http://localhost:3001")  # Change URL to match your server

    # Log in
    email_input = driver.find_element(By.NAME, "email")
    password_input = driver.find_element(By.NAME, "password")
    
    email_input.send_keys("admin@email.com")
    password_input.send_keys("password")
    password_input.send_keys(Keys.RETURN)  # Press Enter to log in

    time.sleep(2)  

    # Navigate to candidate search button
    search_button = driver.find_element(By.NAME, "candidate")
    search_button.click()

    time.sleep(2)

    # Type in the search bar
    name_input = driver.find_element(By.ID, "searchInput")

    a = 0 #first name of user cause that is what the selenium is looking for in the visablity check
    b = 0 #incriment number so that first name is changed each time
    for tester in testers:
        name_input.send_keys(tester)
        time.sleep(.5)
        try:
            WebDriverWait(driver, 2).until(EC.visibility_of_element_located( (By.XPATH, f"//td[contains(text(), '{tester[a]}')]")))
            result = driver.find_element(By.XPATH, f"//td[contains(text(), '{testers[a]}')]")
            print(f"Test passed: {tester} found in search results")
        except:
            print(f"Test failed: {tester} not found in search results")

        name_input.clear()
        b + 1
        if b == 4: 
            a + 4
            b = 0
        

finally:
    # Close the browser
    driver.quit()