import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, ToastAndroid, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FIREBASE_FIRESTORE } from "../../FirebaseConfig";
import { addDoc, collection, query, doc, updateDoc, onSnapshot, getDoc, where } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";

const WalletScreen = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [totalAmount, setTotalAmount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [isSlowInternet, setIsSlowInternet] = useState(false);
    const [isFetchingBalance, setIsFetchingBalance] = useState(true);
    const [isMonthlyView, setIsMonthlyView] = useState(false);
    const [isWeeklyView, setIsWeeklyView] = useState(false);
    const [isAllView, setIsAllView] = useState(true);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const modalWidth = screenWidth * 0.9;

    const navigation = useNavigation();

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

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

      const deposit = async () => {
        setIsLoading(true);
        try {

            if (!depositAmount) {
                ToastAndroid.show('Please input amount first', ToastAndroid.SHORT);
                return;
            }
    
            setDepositAmount('');
            setIsModalVisible(false);
    
            const currentBalance = await getBalance();
            await storeBalance(currentBalance);

            const timestamp = new Date();
            const sign = '+';

            const storedUsername = await AsyncStorage.getItem("username");
    
            const docRef = await addDoc(collection(FIREBASE_FIRESTORE, 'Deposit'), {
                amount: parseFloat(depositAmount),
                sign: sign,
                timestamp: timestamp,
                fullTimestamp: timestamp,
                username: storedUsername,
            });

        } catch (error) {
            console.error('Error adding transaction: ', error);
        } finally {
          setIsLoading(false);
        }
    };

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

    const storeBalance = async (currentBalance) => {
      try {
        const storedUsername = await AsyncStorage.getItem("username");

        const userBalanceDocRef = doc(FIREBASE_FIRESTORE, "userBalance", storedUsername);
        await updateDoc(userBalanceDocRef, { amount: currentBalance+parseFloat(depositAmount) });
      } catch (error) {
          console.error('Error updating user balance: ', error);
      }
    }
    
    const fetchTransactions = async () => {
        try {
          const storedUsername = await AsyncStorage.getItem("username");
          const transactionsQuery = query(collection(FIREBASE_FIRESTORE, 'Deposit'), where('username', '==', storedUsername));
          unsubscribe = onSnapshot(transactionsQuery, (querySnapshot) => {
            const transactionsData = [];

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const timestamp = data.timestamp.toDate();
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
              const amount = parseFloat(data.amount);
              const sign = data.sign;
              
              transactionsData.push({
                id: doc.id,
                amount: amount,
                sign: sign,
                timestamp: timeAgo,
                fullTimestamp: timestamp,
                rawTimestamp: timestamp,
              });
            });
      
            transactionsData.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

            let filteredTransactions = [];
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
    
            setTransactions(filteredTransactions);

          });
        } catch (error) {
          console.error('Error fetching transactions: ', error);
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
      

      let unsubscribe;

      const fetchBalance = async () => {
        try {
          setTotalAmount(0);

          const storedUsername = await AsyncStorage.getItem("username");
          const balanceDocRef = doc(FIREBASE_FIRESTORE, "userBalance", storedUsername);
          unsubscribe = onSnapshot(balanceDocRef, (doc) => {
            if (doc.exists()) {
            const balanceData = doc.data();
            const balance = balanceData.amount;
            if (!isNaN(balance)) {
                setIsFetchingBalance(false);
                setTotalAmount(balance);
              } else {
                console.log("Invalid balance data:", balanceData.amount);
              }
            } else {
                console.error("Balance document does not exist.");
            }
          });
      
          return { unsubscribe };
        } catch (error) {
          console.error('Error fetching balance: ', error);
        }
      };      
      
      useEffect(() => {
        fetchBalance();
      
        return () => {
          if (unsubscribe) {
            unsubscribe();
          }
        };
      }, []);

  

    return(
        <View style={styles.container}>
          {isConnected ? (
          <><View style={{ margin: screenWidth * 0.04 }}>
            <Text style={[styles.textBold, { fontSize: 20, color: '#FAAC33' }]}>My Wallet</Text>
          </View><View style={styles.cardTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="wallet" size={(8 / 100) * screenWidth} color="#151924" />
                <Text style={[styles.textBold, { fontSize: (6 / 100) * screenWidth, color: '#151924', marginHorizontal: 5, }]}>Total balance</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                { isFetchingBalance ? (
                  <Text style={{fontFamily: 'Open-Sans', fontSize: (9 / 100) * screenWidth, color: '#151924'}}>Calculating...</Text>
                ) : (
                <Text style={[styles.textBold, { fontSize: (9 / 100) * screenWidth, color: '#151924' }]}>₱ {totalAmount}</Text>
                )}
                <TouchableOpacity onPress={toggleModal} style={{ backgroundColor: '#151924', borderRadius: 50, paddingLeft: 3, }}>
                  <Ionicons name="add-outline" color="#FAAC33" size={(9 / 100) * screenWidth} />
                </TouchableOpacity>
              </View>
            </View><View style={{
              marginHorizontal: screenWidth * 0.04,
              marginTop: screenHeight * 0.02,
              flex: 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, }}>
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
                    <View style={{ alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Open-Sans-Light', color: '#8E9095'}}>
                        {item.fullTimestamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </Text>
                      <Text style={[styles.textBold, { fontSize: 18, color: item.sign === '+' ? '#FAAC33' : '#8E9095' }]}>₱ {item.sign}{item.amount.toFixed(2)}</Text>
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: 'Open-Sans-Light', color: '#8E9095'}}>
                      {item.timestamp}
                    </Text>
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
                    <View style={[styles.modalContent, { width: modalWidth }]}>
                    <TouchableOpacity style={{alignSelf: 'flex-end'}} onPress={toggleModal} disabled={isLoading}>
                      <Ionicons name="close-outline" size={24} color="white"/>
                    </TouchableOpacity>
                    <View style={{alignSelf: 'center', marginBottom: 10,}}>
                      <Text style={{fontFamily: 'Open-Sans-Bold', fontSize: 30, color: 'white'}}>Deposit</Text>
                    </View>
                    <TextInput
                    placeholder="Amount. Ex. 299"
                    placeholderTextColor="#a9a9a9"
                    style={[styles.text, styles.input]}
                    value={depositAmount}
                    onChangeText={(text) => setDepositAmount(text)}
                    keyboardType="numeric" 
                    />
                        <TouchableOpacity onPress={deposit} style={styles.buttonDeposit} disabled={isLoading} >
                        {isLoading ? (
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <ActivityIndicator color="white" />
                              <Text style={[styles.text, { color: 'white', marginLeft: 5}]}>Loading...</Text>
                            </View>
                        ) : (
                            <Text style={[styles.text, { color: 'white' }]}>Deposit</Text>
                        )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#151924',
    }, 
    textBold: {
        fontFamily: 'Open-Sans-Bold'
    },
    cardTop: {
        elevation: 10, 
        backgroundColor: '#FAAC33',
        marginHorizontal: 20,
        borderRadius: 30,
        padding: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        borderRadius: 5,
        padding: 20,
        elevation: 5,
        backgroundColor: '#151924',
    },
    buttonDeposit: {
        backgroundColor: '#FAAC33',
        alignItems: 'center',
        paddingVertical: 10,
        margin: 5,
        borderRadius: 5,
    },
    input: {
        borderWidth: 1,
        margin: 5,
        padding: 5,
        borderRadius: 5,
        borderColor: '#FAAC33',
        color: 'white'
    },
    item: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#FAAC33',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 5,
        alignItems: 'center',
    },
    textButton: {
      fontFamily: 'Open-Sans',
      color: '#FAAC33',
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

export default WalletScreen;