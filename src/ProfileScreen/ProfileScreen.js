import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions, ActivityIndicator, TextInput, Modal  } from "react-native";
import { FIREBASE_FIRESTORE } from "../../FirebaseConfig";
import { collection, query, onSnapshot, where, doc, getDoc, getDocs } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import CalendarModal from "../../Component/Calendar";
import ColorPickerModal from "../../Component/ColorPicker";
import NetInfo from "@react-native-community/netinfo";
import QRCode from "react-native-qrcode-svg";

const ProfileScreen = () => {

    const [username, setUsername] = useState("");
    const [totalSpent, setTotalSpent] = useState(0);
    const [totalDeposit, setTotalDeposit] = useState(0);
    const [isFetchingDepositAmount, setIsFetchingDepositAmount] = useState(true);
    const [isFetchingSpentAmount, setIsFetchingSpentAmount] = useState(true);
    const [createdDate, setCreatedDate] = useState('');
    const rotationValue = new Animated.Value(0);
    const rotationValue2 = new Animated.Value(0);
    const [depositColor, setDepositColor] = useState('#075D44');
    const [expenseColor, setExpenseColor] = useState('#F0F424'); 
    const DEFAULT_DEPOSIT_COLOR = '#075D44';
    const DEFAULT_EXPENSE_COLOR = '#F0F424';
    const [isColorPickerVisible, setColorPickerVisible] = useState(false);
    const [selectedSection, setSelectedSection] = useState('');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedEmail, setEditedEmail] = useState("");
    const [editedName, setEditedName] = useState("");
    const [isQrCodeModalVisible, setIsQrCodeModalVisible] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [qrLink, setQrLink] = useState("");

    const depositPercentage = (totalDeposit / (totalDeposit + totalSpent)) * 100;
    const expensePercentage = (totalSpent / (totalDeposit + totalSpent)) * 100;

    const screenWidth = Dimensions.get('window').width;
    const modalWidth = screenWidth * 0.9;

    const [isCalendarVisible, setCalendarVisible] = useState(false);

    const [isConnected, setIsConnected] = useState(true);
    const [isSlowInternet, setIsSlowInternet] = useState(false);

    useEffect(() => {
        fetchDeposit();
        fetchTransactions();
        fetchUsers();
        fetchQRLInk();
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

    const openQrCodeModal = () => {
        setIsQrCodeModalVisible(true);
    };
    
    const closeQrCodeModal = () => {
        setIsQrCodeModalVisible(false);
    };      

    const openCalendar = () => {
      setCalendarVisible(true);
    };
  
    const closeCalendar = () => {
      setCalendarVisible(false);
    };

    const handleOpenColorPicker = (section) => {
        setSelectedSection(section);
        setColorPickerVisible(true);
    };

    const handleCloseColorPicker = () => {
        setColorPickerVisible(false);
    };
    
    const handleColorSelection = (color) => {
        if (selectedSection === 'Deposit') {
          setDepositColor(color);
          AsyncStorage.setItem('depositColor', color)
            .catch((error) => {
              console.error('Error saving deposit color to AsyncStorage:', error);
            });
        } else if (selectedSection === 'Expense') {
          setExpenseColor(color);
          AsyncStorage.setItem('expenseColor', color)
            .catch((error) => {
              console.error('Error saving expense color to AsyncStorage:', error);
            });
        }
    
        handleCloseColorPicker();
      };
    
    
      useEffect(() => {
        AsyncStorage.getItem('depositColor')
          .then((savedColor) => {
            if (savedColor) {
              setDepositColor(savedColor);
            } else {
              setDepositColor(DEFAULT_DEPOSIT_COLOR);
            }
          })
          .catch((error) => {
            console.error('Error retrieving deposit color from AsyncStorage:', error);
          });
    
        AsyncStorage.getItem('expenseColor')
          .then((savedColor) => {
            if (savedColor) {
              setExpenseColor(savedColor);
            } else {
              setExpenseColor(DEFAULT_EXPENSE_COLOR);
            }
          })
          .catch((error) => {
            console.error('Error retrieving expense color from AsyncStorage:', error);
          });
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

    const fetchTransactions = async () => {

        const storedUsername = await AsyncStorage.getItem("username");

        const unsubscribe = onSnapshot(query(collection(FIREBASE_FIRESTORE, 'transactions'), where('username', '==', storedUsername) ), 
        (querySnapshot) => {
        const transactionsData = [];
        let totalSpentAmount= 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const amount = parseFloat(data.amount);

            transactionsData.push({
                id: doc.id,
                amount: amount,
              });
            totalSpentAmount += amount;
        });
            setIsFetchingSpentAmount(false);
            setTotalSpent(totalSpentAmount);
        });

        return () => {
            unsubscribe();
        };

    }

    const fetchDeposit = async () => {

        const storedUsername = await AsyncStorage.getItem("username");

        const unsubscribe = onSnapshot(query(collection(FIREBASE_FIRESTORE, 'Deposit'), where('username', '==', storedUsername) ), 
        (querySnapshot) => {
        const transactionsData = [];
        let totalDepositAmount= 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const amount = parseFloat(data.amount);

            if (amount > 0) {
                transactionsData.push({
                    id: doc.id,
                    amount: amount,
                });
                totalDepositAmount += amount;
            }
        });
            setIsFetchingDepositAmount(false);
            setTotalDeposit(totalDepositAmount);
        });

        return () => {
            unsubscribe();
        };

    }

    const handleRefreshDeposit = () => {
        Animated.timing(rotationValue, {
            toValue: 1,
            duration: 1000, 
            easing: Easing.linear,
            useNativeDriver: false, 
        }).start(() => {
            
            rotationValue.setValue(0);
            fetchDeposit();
        });
    };
    
    const handleRefreshSpent = () => {
        Animated.timing(rotationValue2, {
            toValue: 1,
            duration: 1000, 
            easing: Easing.linear,
            useNativeDriver: false, 
        }).start(() => {
            rotationValue2.setValue(0);
            fetchTransactions();
        });
    };

    const handleEditEmail = () => {
        setIsEditingEmail(true);
        setEditedEmail(editedEmail);
    };

    const handleEditName = () => {
        setIsEditingName(true);
        setEditedName(editedName);
    };

    const handleSaveEmail = async () => {
        try {
            await AsyncStorage.setItem('editedEmail', editedEmail);
            setIsEditingEmail(false);
        } catch (error) {
            console.error('Error saving edited email to AsyncStorage:', error);
        }
    };
    
    const handleSaveName = async () => {
        try {
            await AsyncStorage.setItem('editedName', editedName);
            setIsEditingName(false);
        } catch (error) {
            console.error('Error saving edited name to AsyncStorage:', error);
        }
    };

    
    useEffect(() => {
        AsyncStorage.getItem('editedEmail')
            .then((savedEmail) => {
                if (savedEmail) {
                    setEditedEmail(savedEmail);
                }
            })
            .catch((error) => {
                console.error('Error retrieving edited email from AsyncStorage:', error);
            });
    
        AsyncStorage.getItem('editedName')
            .then((savedName) => {
                if (savedName) {
                    setEditedName(savedName);
                }
            })
            .catch((error) => {
                console.error('Error retrieving edited name from AsyncStorage:', error);
            });
    }, []);



    const fetchUsers = async () => {
        const storedUsername = await AsyncStorage.getItem("username");

        if (!storedUsername) {
          console.log('No username found in AsyncStorage.');
          return;
        }
        const userCollectionRef = collection(FIREBASE_FIRESTORE, 'users');
        const userQuery = query(userCollectionRef, where('username', '==', storedUsername));
      
        try {
          const querySnapshot = await getDocs(userQuery);
      
          if (!querySnapshot.empty) {
            const firestoreUsername = querySnapshot.docs[0].data().username;
            const timestamp = querySnapshot.docs[0].data().timestamp;
      
            if (storedUsername === firestoreUsername) {
                const formattedTimestamp = timestamp.toDate().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
                setCreatedDate(formattedTimestamp);
            } else {
              console.log('Username do not match.');
            }
          } else {
            console.log('No user found with the provided username in Firestore.');
          }
        } catch (error) {
          console.error('Error querying user by username:', error);
        }
    }

    const fetchQRLInk = async () => {

        const qrCollectionRef = collection(FIREBASE_FIRESTORE, 'QRLink');
        const qrQuery = query(qrCollectionRef);
      
        try {
          const querySnapshot = await getDocs(qrQuery);
      
          if (!querySnapshot.empty) {
            const qrLink = querySnapshot.docs[0].data().link;
            setQrLink(qrLink);
          } else {
            console.log('No QR in Firestore.');
          }
        } catch (error) {
          console.error('Error querying QR:', error);
        }
    }
    

    return(
        <View style={styles.container}>
            {isConnected ? (
            <><View style={styles.header}>
                    <TouchableOpacity onPress={openCalendar} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 10, paddingHorizontal: 12, borderRadius: 50 }}>
                        <Ionicons name="calendar-outline" size={30} color="white" />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: 'Open-Sans-Bold', fontSize: (5 / 100) * screenWidth, color: '#8E9095' }}>{username}</Text>
                </View><CalendarModal isVisible={isCalendarVisible} onClose={closeCalendar} /><View style={styles.totalContainer}>
                        <View style={[styles.depositContainer, { backgroundColor: depositColor }]}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontFamily: 'Open-Sans', color: '#FFFFFF', fontSize: (5 / 100) * screenWidth, marginRight: 5, }}>Deposit</Text>
                                    <Ionicons name="trending-up-outline" color="white" size={(5 / 100) * screenWidth} />
                                </View>
                                <View style={{marginVertical: 5}}/>
                                {isFetchingDepositAmount ? (
                                    <Text style={{ fontFamily: 'Open-Sans', fontSize: (7 / 100) * screenWidth, color: '#FFFFFF' }}>Calculating...</Text>
                                ) : (
                                    <Text style={{ fontFamily: 'Open-Sans-Bold', color: '#FFFFFF', fontSize: (7 / 100) * screenWidth, marginTop: 5 }}>
                                        ₱ {totalDeposit.toFixed(2)}
                                    </Text>
                                )}
                            </View>
                            <View style={{alignItems: 'center'}}>
                            <TouchableOpacity onPress={() => handleOpenColorPicker('Deposit')} style={{backgroundColor: 'white', borderRadius: 50, padding: 3, paddingHorizontal: 4}}>
                            <Ionicons name="color-palette-outline" color={depositColor} size={18}/>
                            </TouchableOpacity>
                            <View style={{marginVertical: 5}}/>
                            <TouchableOpacity onPress={handleRefreshDeposit}>
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotate: rotationValue.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0deg', '360deg'],
                                                }),
                                            },
                                        ],
                                    }}
                                >
                                    <Ionicons name="sync-outline" color="#FFFFFF" size={24} />
                                </Animated.View>
                            </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ marginVertical: 5, }} />
                        <View style={[styles.spentContainer, { backgroundColor: expenseColor }]}>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontFamily: 'Open-Sans', color: 'black', fontSize: (5 / 100) * screenWidth, marginRight: 5, }}>Expense</Text>
                                    <Ionicons name="trending-down-outline" color="black" size={(5 / 100) * screenWidth} />
                                </View>
                                <View style={{marginVertical: 5}}/>
                                {isFetchingSpentAmount ? (
                                    <Text style={{ fontFamily: 'Open-Sans', fontSize: (7 / 100) * screenWidth, color: 'black' }}>Calculating...</Text>
                                ) : (
                                    <Text style={{ fontFamily: 'Open-Sans-Bold', color: 'black', fontSize: (7 / 100) * screenWidth, marginTop: 5 }}>
                                        ₱ {totalSpent.toFixed(2)}
                                    </Text>
                                )}
                            </View>
                            <View style={{alignItems: 'center'}}>
                            <TouchableOpacity onPress={() => handleOpenColorPicker('Expense')} style={{backgroundColor: 'black', borderRadius: 50, padding: 3, paddingHorizontal: 4}}>
                            <Ionicons name="color-palette-outline" color={expenseColor} size={18}/>
                            </TouchableOpacity>
                            <View style={{marginVertical: 5}}/>
                            <TouchableOpacity onPress={handleRefreshSpent}>
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                rotate: rotationValue2.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0deg', '360deg'],
                                                }),
                                            },
                                        ],
                                    }}
                                >
                                    <Ionicons name="sync-outline" color="black" size={24} />
                                </Animated.View>
                            </TouchableOpacity>
                            </View>
                        </View>
                    </View><View style={styles.colorPickerContainer}>
                        {isColorPickerVisible && (
                            <ColorPickerModal
                                onSelectColor={handleColorSelection}
                                onClose={handleCloseColorPicker} />
                        )}
                    </View>
                    <View style={styles.barContainer}>
                    {isFetchingDepositAmount || isFetchingSpentAmount ? (
                            <Text> </Text>
                    ) : (
                        <>
                            <View style={[styles.bar, { width: `${depositPercentage}%`, backgroundColor: depositColor }]}></View>
                            <View style={[styles.bar2, { width: `${expensePercentage}%`, backgroundColor: expenseColor }]}></View>
                        </>
                    )}
                    </View>
                    <View style={styles.labelContainer}>
                    <Text style={styles.barLabel}>Deposit</Text>
                    <Text style={styles.barLabel}>Expense</Text>
                    </View>
                    <Text style={{fontFamily: 'Open-Sans-Bold', color: 'white', marginHorizontal: 20, marginTop: 50, marginBottom: 10, fontSize: (4 / 100) * screenWidth,}}>Personal Information</Text>
                    <View style={styles.infoWrapper}>
                    <View style={styles.infoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 50, padding: 5, paddingHorizontal: 6 }}>
                            <Ionicons name="mail-outline" color="white" size={20} />
                        </View>
                        <Text style={styles.textInfo}>Email:</Text>
                    </View>
                    {isEditingEmail ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                value={editedEmail}
                                onChangeText={setEditedEmail}
                                style={[styles.textInput, { borderColor: 'white', borderWidth: 0.5, width: 200, borderRadius: 5, marginRight: 5}]}
                            />
                            <TouchableOpacity onPress={handleSaveEmail}>
                                <Ionicons name="checkmark-circle" color="white" size={20} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.textInfo}>{editedEmail}</Text>
                            <TouchableOpacity onPress={handleEditEmail}>
                                <Ionicons name="create-outline" color="white" size={20} />
                            </TouchableOpacity>
                        </View>
                    )}
                    </View>
                    <View style={{marginVertical: 5}}/>
                    <View style={styles.infoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 50, padding: 5, paddingHorizontal: 6 }}>
                            <Ionicons name="person-outline" color="white" size={20} />
                        </View>
                        <Text style={styles.textInfo}>Name:</Text>
                    </View>
                    {isEditingName ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TextInput
                                value={editedName}
                                onChangeText={setEditedName}
                                placeholderTextColor="#8E9095"
                                style={[styles.textInput, { borderColor: 'white', borderWidth: 0.5, width: 200, borderRadius: 5, marginRight: 5}]}
                            />
                            <TouchableOpacity onPress={handleSaveName}>
                                <Ionicons name="checkmark-circle" color="white" size={20}/>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.textInfo}>{editedName}</Text>
                            <TouchableOpacity onPress={handleEditName}>
                                <Ionicons name="create-outline" color="white" size={20} />
                            </TouchableOpacity>
                        </View>
                    )}
                    </View>
                    <View style={{marginVertical: 5}}/>
                    <View style={styles.infoContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 50, padding: 5, paddingHorizontal: 6 }}>
                                <Ionicons name="calendar-outline" color="white" size={20}/>
                            </View>
                            <Text style={styles.textInfo}>Created at:</Text>
                        </View>
                        <Text style={styles.textInfo}>{createdDate}</Text>
                    </View>
                    </View>
                    <View style={{marginVertical: 5}}/>
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 20, marginBottom: 10,}}>
                    <Text style={{fontFamily: 'Open-Sans-Bold', color: 'white', fontSize: (4 / 100) * screenWidth,}}>Download App</Text>
                    </View>
                    <View style={styles.infoWrapper}>
                    <View style={styles.infoContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 50, padding: 5, paddingHorizontal: 6 }}>
                            <Ionicons name="cloud-download-outline" color="white" size={20} />
                        </View>
                        <Text style={styles.textInfo}>ExTrack</Text>
                    </View>
                        <TouchableOpacity onPress={openQrCodeModal} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="qr-code-outline" color="white"/>
                            <Text style={styles.textInfo}>Scan QR to download</Text>
                        </TouchableOpacity>
                    </View>
                    </View>
                    </>
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
                transparent
                animationType="fade"
                visible={isQrCodeModalVisible}
                onRequestClose={() => onClose(false)}
            >
            <TouchableOpacity style={styles.modalContainer} onPress={closeQrCodeModal} activeOpacity={11}>
            <View style={[styles.modalContent, {width: modalWidth}]}>
            <QRCode
                value={qrLink}
                size={200}
            />
            </View>
            </TouchableOpacity>
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
        alignItems: 'center',
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 30,
    },
    totalContainer: {
        margin: 20
    },
    depositContainer: {
        elevation: 5,
        borderRadius: 15,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    spentContainer: {
        elevation: 5,
        borderRadius: 15,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    colorPickerContainer: {
        marginHorizontal: 20,
        flexDirection: 'row',
        alignSelf: 'center'
    },
    barContainer: {
        flexDirection: "row",
        height: 8,
        width: "90%", 
        backgroundColor: "transparent", 
        borderRadius: 15, 
        alignSelf: 'center',
    },
    bar: {
        alignItems: "center",
        justifyContent: "center",
        borderTopLeftRadius: 5,
        borderBottomLeftRadius: 5,
    },
    bar2: {
        alignItems: "center",
        justifyContent: "center",
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5,
    },
    barLabel: {
        fontSize: 10,
        fontFamily: 'Open-Sans',
        color: "white",
    },
    labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginVertical: 10,
    },
    textInfo: {
        fontFamily: 'Open-Sans',
        color: '#8E9095',
        marginLeft: 10,
        marginRight: 5,
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    infoWrapper:{
        borderWidth: 1,
        marginHorizontal: 20,
        padding: 10,
        borderRadius: 5,
        borderColor: '#8E9095'
    },
    textInput:{
        color: '#8E9095',
        paddingHorizontal: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        borderRadius: 5,
        padding: 20,
        elevation: 5,
        backgroundColor: '#151924',
        alignItems: 'center'
    },
});

export default ProfileScreen;