import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, FlatList, ToastAndroid, ActivityIndicator, Image, Dimensions, SafeAreaView} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FIREBASE_FIRESTORE } from '../../FirebaseConfig';
import { addDoc, collection, query, doc, updateDoc, getDoc, where, onSnapshot } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { LineChart } from "react-native-chart-kit";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import DateTimePicker from '@react-native-community/datetimepicker';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';


const HomeScreen = () => {

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [categoryModal, setCategoryModal] = useState(false);
    const [transactionTitle, setTransactionTitle] = useState('');
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [currentMonthYear, setCurrentMonthYear] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [totalAmountThisMonth, setTotalAmountThisMonth] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isSlowInternet, setIsSlowInternet] = useState(false);
    const [isFetchingAmount, setIsFetchingAmount] = useState(true);
    const [isMonthlyView, setIsMonthlyView] = useState(false);
    const [isWeeklyView, setIsWeeklyView] = useState(false);
    const [isAllView, setIsAllView] = useState(true);
    const [isAllTotal, setIsAllTotal] = useState(0);

    const [lastResetDate, setLastResetDate] = useState(null);
    const [isConnected, setIsConnected] = useState(true);

    const navigation = useNavigation();

    const RESET_INTERVAL = 60000;
    const TRANSACTION_PLACEHOLDER = "Amount. Ex. 299";
    const TRANSACTION_TITLE_PLACEHOLDER = "Transaction Title";
    const ERROR_MESSAGE = "Please input all data first";
    const INSUFFICIENT_BALANCE_ERROR = "Insufficient Balance on your wallet";

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const modalWidth = screenWidth * 0.9;

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const BACKGROUND_FETCH_TASK = 'background-fetch';
    const RESET_HOUR = 8;
    const RESET_MINUTE = 1; 

    TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
      const currentDate = new Date();
      const currentDayOfWeek = currentDate.getDay();
      const currentHour = currentDate.getHours();
      const currentMinute = currentDate.getMinutes();

      if (currentDayOfWeek === 1 && currentHour === RESET_HOUR && currentMinute === RESET_MINUTE) {
        resetChart();
      }

      return BackgroundFetch.Result.NewData;
    });

    useEffect(() => {
  
      BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: RESET_INTERVAL / 1000, 
        stopOnTerminate: false,
        startOnBoot: true, 
      });
    }, []);

    const checkTaskIsRunning = async () => {
      const registeredTasks = await TaskManager.getRegisteredTasksAsync();
      
      const isRunning = registeredTasks.some(task => task.taskName === BACKGROUND_FETCH_TASK);
    
      if (isRunning) {
        console.log(`The ${BACKGROUND_FETCH_TASK} task is running.`);
      } else {
        console.log(`The ${BACKGROUND_FETCH_TASK} task is not running.`);
      }
    };

    useEffect(() => {
      checkTaskIsRunning();
    }, []);

  
    const onChangeDate = (event, selectedDate) => {
      setShowDatePicker(Platform.OS === 'ios');
      if (selectedDate) {
        setSelectedDate(selectedDate);
      }
    };
  
    const onChangeTime = (event, selectedTime) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedTime) {
        setSelectedTime(selectedTime);
      }
    };
  
    const showDatepicker = () => {
      setShowDatePicker(true);
    };
  
    const showTimepicker = () => {
      setShowTimePicker(true);
    };


    useEffect(() => {
        
      loadChartData();
    }, []);

    useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
        setIsConnected(state.isConnected);
        
        if (state.isConnected && state.isInternetReachable !== true) {
          setIsSlowInternet(true);
        } else {
          setIsSlowInternet(false);
        }
      });
  
      return () => {
        unsubscribe();
      };
    }, []);

    useEffect(() => {
        const retrieveUsername = async () => {
          try {
            const storedUsername = await AsyncStorage.getItem("username");
            if (storedUsername) {
              setUsername(storedUsername);
            }
          } catch (error) {
            console.error("Error retrieving username from AsyncStorage:", error);
          }
        };
        retrieveUsername();
      }, []);


    const toggleCategoryModal = () => {
        setCategoryModal(!categoryModal);
    };

    const toggleModal = (category) => {
      setSelectedCategory(category);
      setIsModalVisible(!isModalVisible);
      setCategoryModal(false);
    }


    const addTransaction = async () => {
        setIsLoading(true);
        try {

            if (!transactionTitle || !transactionAmount) {
                ToastAndroid.show(ERROR_MESSAGE, ToastAndroid.SHORT);
                return;
            }

            const currentBalance = await getBalance();
            if (currentBalance < parseFloat(transactionAmount)){
                ToastAndroid.show(INSUFFICIENT_BALANCE_ERROR, ToastAndroid.SHORT);
                return;
            } else {
                await updateBalance(currentBalance);
            }
            
            const timestamp = new Date();

            const selectedDateTime = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                selectedTime.getHours(),
                selectedTime.getMinutes()
            );

            const storedUsername = await AsyncStorage.getItem("username");
        

            await addDoc(collection(FIREBASE_FIRESTORE, 'Deposit'), {
                title: transactionTitle,
                amount: -parseFloat(transactionAmount),
                timestamp: timestamp,
                username: storedUsername,
                category: selectedCategory
            });

            const docRef = await addDoc(collection(FIREBASE_FIRESTORE, 'transactions'), {
                title: transactionTitle,
                amount: parseFloat(transactionAmount),
                timestamp: selectedDateTime, 
                fullTimestamp: selectedDateTime,
                username: storedUsername,
                category: selectedCategory
            });
        
            setTransactionTitle('');
            setTransactionAmount('');
            setSelectedDate(new Date());
            setSelectedTime(new Date());
            setIsModalVisible(false);
            setCategoryModal(false);         
            
            updateChartData(parseFloat(transactionAmount));

        } catch (error) {
            console.error('Error adding transaction: ', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {

          const storedUsername = await AsyncStorage.getItem("username");

          const unsubscribe = onSnapshot(query(collection(FIREBASE_FIRESTORE, 'transactions'), where('username', '==', storedUsername) ), 
          (querySnapshot) => {
          const transactionsData = [];


          const currentDateNow = new Date();
          const currentMonthNow = currentDateNow.toLocaleString('default', { month: 'long' });
          const currentYearNow = currentDateNow.getFullYear();
          const currentMonthYearValue = `${currentMonthNow} ${currentYearNow}`;
          setCurrentMonthYear(currentMonthYearValue);
            
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const timestamp = data.timestamp.toDate();
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
              const amount = parseFloat(data.amount);
    
                transactionsData.push({
                  id: doc.id,
                  title: data.title,
                  amount: amount,
                  timestamp: timeAgo,
                  fullTimestamp: timestamp,
                  rawTimestamp: timestamp,
                  category: selectedCategory,
                });

            });
    
             transactionsData.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
            
            let total = 0;
            transactionsData.forEach((transaction) => {
              total += parseFloat(transaction.amount);
            });

            let totalThisMonth = 0;
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            transactionsData.forEach((transaction) => {
              const timestamp = transaction.fullTimestamp;
              
              if (
                timestamp.getMonth() === currentMonth &&
                timestamp.getFullYear() === currentYear
              ) {
                totalThisMonth += parseFloat(transaction.amount);
              }
            });

            setIsFetchingAmount(false);
            setTotalAmountThisMonth(totalThisMonth);

            let filteredTransactions = [];
            let allTotal = 0;
            if (isMonthlyView) {
                const currentDate = new Date();
                const currentMonth = currentDate.getMonth();
                const currentYear = currentDate.getFullYear();
    
                filteredTransactions = transactionsData.filter((transaction) => {
                    const timestamp = transaction.fullTimestamp;
                    return (
                        timestamp.getMonth() === currentMonth &&
                        timestamp.getFullYear() === currentYear
                    );
                });
            } else if (isWeeklyView) {
                const currentDate = new Date();
                const currentDayOfWeek = currentDate.getDay();
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek); 
                const endOfWeek = new Date(currentDate);
                endOfWeek.setDate(startOfWeek.getDate() + 6); 
    
                filteredTransactions = transactionsData.filter((transaction) => {
                    const timestamp = transaction.fullTimestamp;
                    return timestamp >= startOfWeek && timestamp <= endOfWeek;
                });
            } else if (isAllView) {
                filteredTransactions = transactionsData;
            }

            filteredTransactions.forEach((transaction) => {
              allTotal += transaction.amount;
            });
            
            setIsAllTotal(allTotal);

            setTransactions(filteredTransactions);

        });
        return () => unsubscribe();

        } catch (error) {
          console.error('Error fetching transactions: ', error);
          setIsSlowInternet(true);
        }
    };

    useEffect(() => {
      fetchTransactions() 
  
      const filterChangeHandler = async () => {
        fetchTransactions();
      };
  
      const filterChangeListener = navigation.addListener('focus', filterChangeHandler);
  
      return () => {
        filterChangeListener(); 
      };
    }, [isMonthlyView, isWeeklyView, isAllView]);     

      const getBalance = async () => {
        try {
            const storedUsername = await AsyncStorage.getItem("username");
            const userBalanceDocRef = doc(FIREBASE_FIRESTORE, "userBalance", storedUsername);
            const userBalanceDocSnapshot = await getDoc(userBalanceDocRef);
            if (userBalanceDocSnapshot.exists()) {
                return userBalanceDocSnapshot.data().amount;
            } else {
                return 0;
            }
        } catch (error) {
            console.error('Error fetching user balance: ', error);
        }
    };
    
      
      const updateBalance = async (currentBalance) => {
        try {
            const storedUsername = await AsyncStorage.getItem("username");
            const userBalanceDocRef = doc(FIREBASE_FIRESTORE, "userBalance", storedUsername);
            await updateDoc(userBalanceDocRef, { amount: currentBalance-parseFloat(transactionAmount) });
        } catch (error) {
            console.error('Error updating user balance: ', error);
        }
      };

      const [chartData, setChartData] = useState({
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0, 0],
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          },
        ],
        legend: ["Daily Spent"]
      });    

      const chartConfig = {
        backgroundGradientFrom: "#151924", 
        backgroundGradientTo: "#151924",
        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        strokeWidth: 2, 
        fillShadowGradient: "#FAAC33", 
        fillShadowGradientOpacity: 1,
      };

      const updateChartData = async (amount) => {
        const currentDate = new Date();
        const currentDayOfWeek = currentDate.getDay();
        
        const selectedDateTime = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );

        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDayOfWeek);
        const endOfWeek = new Date(currentDate);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
      
        if (
          selectedDateTime >= startOfWeek && 
          selectedDateTime <= endOfWeek
        ) {
        
        const newChartData = { ...chartData };
        const selectedDayOfWeek = selectedDate.getDay(); 
        newChartData.datasets[0].data[selectedDayOfWeek] += amount;
      
        setChartData(newChartData);
      
            try {
            await AsyncStorage.setItem('chartData', JSON.stringify(chartData));
            } catch (error) {
            console.error('Error storing chart data:', error);
            }
        }
      };
      
      
      const loadChartData = async () => {
        try {
          const savedChartData = await AsyncStorage.getItem('chartData');
          if (savedChartData) {
            setChartData(JSON.parse(savedChartData));
          }
        } catch (error) {
          console.error('Error loading chart data:', error);
        }
      };      

      //reset chart every moday at 8:01 am
      useEffect(() => {
        const loadLastResetDate = async () => {
          try {
            const savedDate = await AsyncStorage.getItem('lastResetDate');
            if (savedDate) {
              setLastResetDate(new Date(savedDate));
            }
          } catch (error) {
            console.error('Error loading last reset date:', error);
          }
        };

        loadLastResetDate();
      }, []);

    
      useEffect(() => {
        const resetInterval = setInterval(checkResetTime, RESET_INTERVAL);
      
        return () => clearInterval(resetInterval);
      }, []);

      const checkResetTime = () => {
        const currentDate = new Date();
        const currentDayOfWeek = currentDate.getDay();
        const currentHour = currentDate.getHours();
        const currentMinute = currentDate.getMinutes();
  
        if (currentDayOfWeek === 1 && currentHour === 8 && currentMinute === 1) {
          resetChart();
        }
      };

      const resetChart = async () => {
        const newChartData = {
          labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          datasets: [
            {
              data: [0, 0, 0, 0, 0, 0, 0],
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            },
          ],
          legend: ["Daily Spent"]
        };
      
        setChartData(newChartData);
      
        const currentDate = new Date();
        setLastResetDate(currentDate);                                            
      
        try {
          await AsyncStorage.setItem('lastResetDate', currentDate.toString());
    
          await AsyncStorage.setItem('chartData', JSON.stringify(newChartData));
        } catch (error) {
          console.error('Error storing last reset date or chart data:', error);
        }
      };     

    return(
        <SafeAreaView style={styles.container}>
            {isConnected ? (
            <><View style={styles.header}>
                    <View style={styles.topLeft}>
                        <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: 18, marginRight: 5, color: '#FAAC33' }}>Welcome, <Text style={{color: 'white',}}>{username}</Text> </Text>
                        {/*<Ionicons name="chevron-down-circle" size={20} />*/}
                    </View>
                </View>
                <View style={[
                    styles.card,
                    { marginHorizontal: screenWidth * 0.04 }
                  ]}>
                        <View style={[
                            styles.topCard,
                            { marginHorizontal: screenWidth * 0.02 }
                          ]}>
                            <View style={{alignSelf: 'flex-start'}}>
                                <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: (5 / 100) * screenWidth, marginBottom: 5, color: '#FAAC33' }}>
                                    {currentMonthYear}
                                </Text>
                                <Text style={[styles.text, { color: '#8E9095', fontSize: hp('1.5%')  }]}>Total spent from transactions</Text>
                                { isFetchingAmount ? (
                                  <Text style={{fontFamily: 'Open-Sans', fontSize: (9 / 100) * screenWidth, color: '#8E9095'}}>Calculating...</Text>
                                ) : (
                                  <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: (9 / 100) * screenWidth, color: 'white' }}>₱ {totalAmountThisMonth}</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={toggleCategoryModal} style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FAAC33', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, }}>
                                <Ionicons name="add-circle-outline" size={(5 / 100) * screenWidth} color="#FAAC33" />
                                <Text style={{ color: '#FAAC33', fontSize: (4 / 100) * screenWidth }}>Add Transaction</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.midCard}>
                            <LineChart
                                data={chartData}
                                width={screenWidth * 0.8}
                                height={screenHeight * 0.3}
                                chartConfig={chartConfig}
                                bezier />
                        </View>
                    </View><View style={{
                          marginHorizontal: screenWidth * 0.05,
                          marginTop: screenHeight * 0.02,
                          flex: 1,
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', }}>
                            <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: (4 / 100) * screenWidth, color: '#8E9095' }}>Transaction History</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center',}}>
                            <TouchableOpacity
                              onPress={() => {
                                fetchTransactions();
                                setIsWeeklyView(false);
                                setIsMonthlyView(false);
                                setIsAllView(true);
                              }}
                              style={[
                                styles.borderButtonAll, isAllView ? { backgroundColor: '#FAAC33' } : {},
                              ]}
                            >
                              <Text style={[styles.textButton, isAllView ? { color: 'black'  } : {}]}>
                                All
                              </Text>
                            </TouchableOpacity>
                            <View style={{marginHorizontal: 2,}}></View>
                            <TouchableOpacity
                              onPress={() => {
                                fetchTransactions();
                                setIsWeeklyView(false);
                                setIsMonthlyView(true);
                                setIsAllView(false);
                              }}
                              style={[
                                styles.borderButton, isMonthlyView ? { backgroundColor: '#FAAC33' } : {},
                              ]}
                            >
                              <Text style={[styles.textButton, isMonthlyView ? { color: 'black'  } : {}]}>
                                Monthly
                              </Text>
                            </TouchableOpacity>
                              <View style={{marginHorizontal: 2,}}></View>
                              <TouchableOpacity
                                onPress={() => {
                                  fetchTransactions();
                                  setIsWeeklyView(true);
                                  setIsMonthlyView(false);
                                  setIsAllView(false);
                                }}
                                style={[
                                  styles.borderButton, isWeeklyView ? { backgroundColor: '#FAAC33' } : {},
                                ]}
                              >
                                <Text style={[styles.textButton, isWeeklyView ? { color: 'black' } : {}]}>
                                  Weekly
                                </Text>
                              </TouchableOpacity>
                            </View>
                        </View>
                        <View >
                          <Text style={{fontFamily: 'Open-Sans-Bold', color: '#8E9095', marginBottom: 10}}>Total: <Text style={{fontFamily: 'Open-Sans'}}>₱ {isAllTotal.toFixed(2)}</Text></Text>
                        </View>
                        <FlatList
                            data={transactions}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={() => (
                                <Text style={{ fontFamily: 'Open-Sans-Light', alignSelf: 'center', color: '#8E9095' }}>
                                    No transactions displayed yet
                                </Text>
                            )}
                            renderItem={({ item }) => (
                                <View style={styles.item}>
                                    <View style={{ alignSelf: 'flex-start'}}>
                                        <Text style={{ fontSize: 13, fontFamily: 'Open-Sans-Light', color: '#8E9095'}}>
                                            {item.fullTimestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                        <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: 18, color: '#8E9095' }}>{item.title}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.textBold, { fontSize: 18, color: '#FAAC33' }]}>₱ {item.amount.toFixed(2)}</Text>
                                        <Text style={{ fontSize: 10, fontFamily: 'Open-Sans-Light', color: '#8E9095' }}>
                                            {item.timestamp}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            keyExtractor={(item) => item.id} />
                    </View></>
                ) : isSlowInternet ? (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginHorizontal: 30,}}>
                    <Text style={{ fontFamily: 'Open-Sans', color: '#8E9095', textAlign: 'center', marginBottom: 5}}>Trying to reconnect. Please check your internet connection and try again.</Text>
                    <ActivityIndicator color="#FAAC33" size="large" />
                  </View>
                ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{fontFamily: 'Open-Sans', color: '#8E9095'}}>No Internet Connection</Text>
                </View>
                )}
            {isModalVisible && (
            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={toggleModal}
            >
                <TouchableOpacity activeOpacity={11} style={styles.modalContainer}>
                    <View style={[styles.modalContent, {  width: modalWidth, }]}>
                    <TouchableOpacity style={{alignSelf: 'flex-end'}} onPress={toggleModal} disabled={isLoading}>
                      <Ionicons name="close-outline" size={24} color="white"/>
                    </TouchableOpacity>
                    <View style={{alignSelf: 'center', marginBottom: 10,}}>
                      <Text style={{fontFamily: 'Open-Sans-Bold', fontSize: 30, color: 'white'}}>Add Transaction</Text>
                    </View>
                    <View style={{alignSelf: 'center', marginBottom: 10,}}>
                      <Text style={{fontFamily: 'Open-Sans-Bold', fontSize: 15, color: 'white'}}><Text style={{fontFamily: 'Open-Sans'}}>Category: </Text>{selectedCategory}</Text>
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <View style={[
                        styles.input,
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: screenWidth * 0.5 }
                    ]}>
                        <TextInput
                        value={selectedDate.toDateString()}
                        editable={false}
                        style={{color:'#8E9095'}}
                        />
                        <TouchableOpacity onPress={showDatepicker}>
                        <Ionicons name="calendar-outline" color="white" size={24}/>
                        </TouchableOpacity>
                    </View>

                    <View style={[
                        styles.input,
                        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1}
                    ]}>
                        <TextInput
                        value={selectedTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}
                        editable={false}
                        style={{color: '#8E9095'}}
                        />
                        <TouchableOpacity onPress={showTimepicker}>
                        <Ionicons name="time-outline" color="white" size={24}/>
                        </TouchableOpacity>
                    </View>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                        testID="datePicker"
                        value={selectedDate}
                        mode="date"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeDate}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                        testID="timePicker"
                        value={selectedTime}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={onChangeTime}
                        />
                    )}

                    <TextInput
                    placeholder={TRANSACTION_TITLE_PLACEHOLDER}
                    placeholderTextColor="#a9a9a9"
                    style={[styles.text, styles.input]}
                    value={transactionTitle}
                    onChangeText={(text) => setTransactionTitle(text)}
                    />
                    <TextInput
                    placeholder={TRANSACTION_PLACEHOLDER}
                    placeholderTextColor="#a9a9a9"
                    style={[styles.text, styles.input]}
                    value={transactionAmount}
                    onChangeText={(text) => setTransactionAmount(text)}
                    keyboardType="numeric"
                    />
                        <TouchableOpacity onPress={addTransaction} style={styles.buttonTransaction} disabled={isLoading}>
                            {isLoading ? (
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <ActivityIndicator color="white" />
                                <Text style={[styles.text, { color: 'white', marginLeft: 5}]}>Loading...</Text>
                                </View>
                            ) : (
                                <Text style={[styles.text, { color: 'white' }]}>Add Transaction</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            )}
            {categoryModal && (
            <Modal
                animationType="fade"
                transparent={true}
                visible={categoryModal}
                onRequestClose={toggleCategoryModal}
            >
                <TouchableOpacity activeOpacity={11} style={styles.modalContainer}>
                    <View style={[styles.modalContent, { width: modalWidth }]}>
                    <TouchableOpacity style={{alignSelf: 'flex-end'}} onPress={toggleCategoryModal}>
                      <Ionicons name="close-outline" size={24} color="white"/>
                    </TouchableOpacity>
                    <View style={{alignSelf: 'center', marginBottom: 10,}}>
                      <Text style={{fontFamily: 'Open-Sans-Bold', fontSize: 30, color: 'white'}}>Select Category</Text>
                    </View>

                    <View style={styles.row}>
                    <TouchableOpacity style={styles.column} onPress={() => toggleModal("Entertainment")}>
                          <Image
                            source={require('../../assets/images/entertainment.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Entertainment</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.column} onPress={() => toggleModal("Food")}>
                          <Image
                            source={require('../../assets/images/food.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Food</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                    <TouchableOpacity style={styles.column} onPress={() => toggleModal("Travel")}>
                          <Image
                            source={require('../../assets/images/travel.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Travel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.column} onPress={() => toggleModal("Shopping")}>
                          <Image
                            source={require('../../assets/images/shopping.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Shopping</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                    <TouchableOpacity style={styles.column} onPress={() => toggleModal("Clothing")}>
                          <Image
                            source={require('../../assets/images/clothing.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Clothing</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.column} onPress={() => toggleModal("Other")}>
                          <Image
                            source={require('../../assets/images/other.png')}
                            style={{ width: 50, height: 50 }}
                          />
                          <Text style={styles.textColumn}>Other</Text>
                      </TouchableOpacity>
                    </View>

                    </View>
                </TouchableOpacity>
            </Modal>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#151924',
    }, 
    text: {
        fontFamily: 'Open-Sans',
    },
    textBold: {
        fontFamily: 'Open-Sans-Bold'
    },
    textLight: {
        fontFamily: 'Open-Sans-Light'
    },
    header: {
        margin: 20,
        flexDirection: 'row',
        alignItems:' center',
        justifyContent: 'space-between',
    },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    card: {
        elevation: 10,
        backgroundColor: '#151924',
        padding: 20,
        borderRadius: 30,
    },
    topCard: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    item: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#FAAC33',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 5,
        alignItems: 'center',
    },
    midCard: {
        marginHorizontal: 5,
        marginTop: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#151924',
        borderRadius: 5,
        padding: 20,
        elevation: 5,
    },
    input: {
        borderWidth: 1,
        margin: 5,
        padding: 5,
        borderRadius: 5,
        borderColor: '#FAAC33',
        color: 'white'
    },
    buttonTransaction: {
        backgroundColor: '#FAAC33',
        alignItems: 'center',
        paddingVertical: 10,
        margin: 5,
        marginTop: 10,
        borderRadius: 5,
    },
    row: {
      flexDirection: 'row', 
      justifyContent: 'space-between',
      marginBottom: 10, 
    },
    column: {
      flex: 1, 
      margin: 5, 
      backgroundColor: '#151924',
      borderRadius: 5,
      padding: 10,
      alignItems: 'center',
      elevation: 10,
    },
    textColumn: {
      color: '#8E9095',
      fontFamily: 'Open-Sans'
    },
    textButton: {
      fontFamily: 'Open-Sans',
      color: '#FAAC33'
    },
    borderButton: {
      borderWidth: 1,
      borderColor: '#FAAC33',
      padding: 5,
      borderRadius: 5,
    },
    borderButtonAll: {
      borderWidth: 1,
      borderColor: '#FAAC33',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 5,
    }
});

export default HomeScreen;