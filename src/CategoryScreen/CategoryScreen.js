import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, FlatList, Modal, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { FIREBASE_FIRESTORE } from "../../FirebaseConfig";
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const CategoryScreen = () => {
    const [categoryData, setCategoryData] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [transactionsData, setTransactionsData] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [currentMonthYear, setCurrentMonthYear] = useState('');
    const [isConnected, setIsConnected] = useState(true);
    const [isSlowInternet, setIsSlowInternet] = useState(false);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const categories = [
        {
            name: 'Entertainment',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Entertainment')
            ),
        },
        {
            name: 'Food',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Food')
            ),
        },
        {
            name: 'Shopping',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Shopping')
            ),
        },
        {
            name: 'Clothing',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Clothing')
            ),
        },
        {
            name: 'Travel',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Travel'),
            ),
        },
        {
            name: 'Other',
            query: query(collection(FIREBASE_FIRESTORE, 'transactions'), 
            where('category', '==', 'Other'),
            ),
        },
      ];

      const categoryImages = {
        Entertainment: require('../../assets/images/entertainment.png'),
        Food: require('../../assets/images/food.png'),
        Shopping: require('../../assets/images/shopping.png'),
        Clothing: require('../../assets/images/clothing.png'),
        Travel: require('../../assets/images/travel.png'),
        Other: require('../../assets/images/other.png'),
    };

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
        const fetchData = async () => {
            const storedUsername = await AsyncStorage.getItem("username");
            const categoryDataPromises = categories.map(async (category) => {
                const querySnapshot = await getDocs(query(
                    collection(FIREBASE_FIRESTORE, 'transactions'),
                    where('category', '==', category.name),
                    where('username', '==', storedUsername)
                ));
                const expenses = querySnapshot.docs.map((doc) => doc.data());

                const currentMonthExpenses = expenses.filter((expense) => {
                    const timestamp = expense.fullTimestamp.toDate();
                    const expenseMonth = timestamp.getMonth() + 1;
                    const expenseYear = timestamp.getFullYear();

                    return expenseMonth === currentMonth && expenseYear === currentYear;
                });

                const totalAmount = currentMonthExpenses.reduce((total, expense) => total + expense.amount, 0);
                return { name: category.name, totalAmount };
            });

            const categoryDataResult = await Promise.all(categoryDataPromises);
            setCategoryData(categoryDataResult);
        };

        fetchData();
    }, []);

    useEffect(() => {
        const unsubscribeListeners = categories.map((category) => {
          return onSnapshot(category.query, async () => {
            try {
            const storedUsername = await AsyncStorage.getItem("username");
            const querySnapshot = await getDocs(query(
                collection(FIREBASE_FIRESTORE, 'transactions'),
                where('category', '==', category.name),
                where('username', '==', storedUsername)
            ));
              const expenses = querySnapshot.docs.map((doc) => doc.data());

              const currentMonthExpenses = expenses.filter((expense) => {
                const timestamp = expense.fullTimestamp.toDate(); 
                const expenseMonth = timestamp.getMonth() + 1; 
                const expenseYear = timestamp.getFullYear();
            
                return expenseMonth === currentMonth && expenseYear === currentYear;
                });

              const totalAmount = currentMonthExpenses.reduce((total, expense) => total + expense.amount, 0);
              setCategoryData((prevData) => {
                const updatedData = prevData.map((item) =>
                  item.name === category.name ? { ...item, totalAmount } : item
                );
                return updatedData;
              });
            } catch (error) {
              console.error('Error fetching and updating data:', error);
            }
          });
        });
      
        return () => {
          unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
        };
      }, []);

    const openModal = async (category) => {
        setSelectedCategory(category);
        setModalVisible(true);
        setCategoryName(category);

        const storedUsername = await AsyncStorage.getItem("username");
      
        const categoryQuery = query(
          collection(FIREBASE_FIRESTORE, 'transactions'),
          where('category', '==', category),
          where('username', '==', storedUsername)
        );
      
        try {
          const querySnapshot = await getDocs(categoryQuery);
          const transactions = querySnapshot.docs.map((doc) => doc.data());
            const currentMonthTransaction = transactions.filter((expense) => {
                const timestamp = expense.fullTimestamp.toDate(); 
                const expenseMonth = timestamp.getMonth() + 1; 
                const expenseYear = timestamp.getFullYear();
        
            return expenseMonth === currentMonth && expenseYear === currentYear;
            });

            currentMonthTransaction.sort((a, b) => b.timestamp - a.timestamp);

          setTransactionsData(currentMonthTransaction);

          const currentDateNow = new Date();
          const currentMonthNow = currentDateNow.toLocaleString('default', { month: 'long' });
          const currentYearNow = currentDateNow.getFullYear();
          const currentMonthYearValue = `${currentMonthNow} ${currentYearNow}`;
          setCurrentMonthYear(currentMonthYearValue);


        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
    };      

    const closeModal = () => {
        setModalVisible(false);
    };
    
    const [numColumns, setNumColumns] = useState(2);
    const [flatListKey, setFlatListKey] = useState('defaultKey');
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    useEffect(() => {
        const screenWidth = Dimensions.get('window').width;
        if (screenWidth < 300) {
            setNumColumns(1);
        } else {
            setNumColumns(2);
        }

        setFlatListKey((prevKey) => prevKey === 'defaultKey' ? 'newKey' : 'defaultKey');
    }, []);
      

        const renderCategoryItem = ({ item }) => (
            <View style={styles.column}>
                <TouchableOpacity onPress={() => openModal(item.name)} 
                    style={{
                        alignSelf: 'flex-end',
                }}>
                <Text style={{
                    color: '#8E9095',
                    marginBottom: 5,
                    fontSize: 10,
                }}>View all</Text>
                </TouchableOpacity>
                <Image
                    source={categoryImages[item.name]}
                    style={{ width: 80, height: 80 }}
                />
                <View style={{
                    alignItems: 'center'
                }}>
                    <Text style={styles.textColumn}>{item.name}</Text>
                    <Text style={styles.text}>₱ {item.totalAmount}</Text>
                </View>
            </View>
        );

        const renderTransactionItem = ({ item }) => (
            <View style={styles.item}>
                <View style={{ alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 13, fontFamily: 'Open-Sans-Light', color: '#8E9095'}}>
                        {item.fullTimestamp.toDate().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: 18, color: '#8E9095' }}>{item.title}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.textBold, { fontSize: 18, color: '#FAAC33' }]}>₱ {item.amount.toFixed(2)}</Text>
                    <Text style={{fontSize: 13, fontFamily: 'Open-Sans-Light', color: '#8E9095'}}>{item.fullTimestamp.toDate().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric' })}</Text>
                </View>
            </View>
        );
          

    return(
        <View style={styles.container}>
            {isConnected ? (
            <><View style={styles.header}>
                    <View style={styles.topLeft}>
                        <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: 18, marginRight: 5, color: '#FAAC33' }}>Categories</Text>
                    </View>
                </View><View style={{ marginHorizontal: 20 }}>
                        <Text style={{
                            textAlign: 'center',
                            fontFamily: 'Open-Sans',
                            color: '#8E9095',
                            marginBottom: 20,
                            fontSize: (3.5 / 100) * screenWidth
                        }}>In this section, you can observe the cumulative expenses within each category for the ongoing month. Moreover, you have the option to access a detailed list of transactions within a specific category by selecting the 'View All' button.</Text>
                    </View><View style={styles.categoryContainer}>
                        <FlatList
                            data={categoryData}
                            renderItem={renderCategoryItem}
                            showsVerticalScrollIndicator={false}
                            keyExtractor={(item) => item.name}
                            key={flatListKey}
                            numColumns={numColumns} />
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
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <View style={[
                    styles.modalContent, 
                    { width: screenWidth, height: screenHeight}
                    ]}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                        <Text style={{color: '#FAAC33', fontSize: 20, fontFamily: 'Open-Sans-Bold'}}>{categoryName}</Text>
                        <TouchableOpacity onPress={closeModal} style={{backgroundColor: '#FAAC33', elevation: 10, borderRadius: 30, padding: 3, paddingHorizontal: 4}}>
                            <Ionicons name="close-outline" size={24} color="white"/>
                        </TouchableOpacity>
                    </View>

                    <Text style={{
                        fontFamily: 'Open-Sans-Bold', 
                        fontSize: (5 / 100) * screenWidth,
                        marginTop: 20, 
                        marginBottom: 10, 
                        color: 'white', 
                    }}>List of Transactions for the month of {currentMonthYear}</Text>
                    <FlatList
                        data={transactionsData}
                        renderItem={renderTransactionItem}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={() => (
                            <Text style={{ fontFamily: 'Open-Sans-Light', alignSelf: 'center', color: '#8E9095' }}>
                                No transactions displayed yet
                            </Text>
                        )}
                        keyExtractor={(item, index) => `${item.id}_${index}`}
                        />
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#151924',
    },
    header: {
        margin: 20,
    },
    row: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        marginBottom: 10, 
      },
      column: {
        flex: 1, 
        margin: '2%',
        backgroundColor: '#151924',
        borderRadius: 20,
        padding: 10,
        paddingHorizontal: 15,
        alignItems: 'center',
        elevation: 10,
        marginBottom: 20,
      },
      textColumn: {
        marginTop: 20,
        color: '#8E9095',
        fontFamily: 'Open-Sans',
        fontSize: 15,
      },
      text: {
        color: '#FAAC33',
        fontFamily: 'Open-Sans-Bold',
        fontSize: 20,
      },
      categoryContainer: {
        marginTop: 'auto',
        marginHorizontal: 10,
        marginBottom: 'auto',
        flex: 1,
      },
      modalContent: {
        backgroundColor: '#151924',
        flex: 1,
        padding: 10,
      },
      item: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#FAAC33',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 5,
        alignItems: 'center',
    },
    textBold: {
        fontFamily: 'Open-Sans-Bold',
    }
});

export default CategoryScreen;