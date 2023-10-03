import React, { useState, useEffect } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ToastAndroid, ActivityIndicator, Modal, Dimensions } from "react-native";
import { FIREBASE_FIRESTORE } from "../../FirebaseConfig";
import { addDoc, collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";

const LoginScreen = ({ onLogin }) => {

  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
  
    return () => {
      unsubscribe();
    };
  }, []);  

  const checkUsernameExists = async (username) => {
    try {
      const usersCollectionRef = collection(FIREBASE_FIRESTORE, "users");
      const usernameQuery = query(
        usersCollectionRef,
        where("username", "==", username),
      );
  
      const querySnapshot = await getDocs(usernameQuery);
  
      return querySnapshot.size > 0;
    } catch (error) {
      console.error("Error checking username: ", error);
      return false; 
    }
  };

  const handleLogin = async () => {
    try {

      setIsLoading(true);

      if (!isConnected) {
        ToastAndroid.show('No internet connection. You can proceed with creating a username.', ToastAndroid.LONG);
        return;
      }

      if(!username) {
        ToastAndroid.show('Please enter your unique username first to continue', ToastAndroid.SHORT);
        return;
      }

      if(username>20){
        ToastAndroid.show('Username exceeds limit of 20 characters', ToastAndroid.SHORT);
        return;
      }

      const exists = await checkUsernameExists(username);

      if (exists) {
        ToastAndroid.show('Username already exist. Try a unique one. ', ToastAndroid.SHORT);
        return;
      } else {
        const timestamp = new Date();

        const docRef = await addDoc(collection(FIREBASE_FIRESTORE, 'users'), {
          username: username,
          timestamp: timestamp, 
        });

        const amount = 0;

        const userBalanceDocRef = doc(FIREBASE_FIRESTORE, "userBalance", username);
        await setDoc(userBalanceDocRef, { amount: parseFloat(amount) });

        onLogin(username);
      }

    } catch (error) {
      console.log('Error inserting username: ', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <TouchableOpacity onPress={() => setShowTooltip(true)}>
        <Ionicons name="information-circle-outline" color="#FAAC33" size={20}/>
        </TouchableOpacity>
        <Modal
          visible={showTooltip}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowTooltip(false)}
        >
          <View style={styles.modalBackground}>
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipText}>
              You can use this feature to display your name and save it within the app. 
              Once you've created it and then closed the app, you won't need to log in with your username again. 
              However, if you uninstall the app, your data will be lost, and you'll need to create a new unique username and enter new data once more.
              </Text>
              <TouchableOpacity
                onPress={() => setShowTooltip(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color="#FAAC33" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Text style={{alignSelf: 'center', marginBottom: 20, fontFamily: 'Open-Sans-Bold', fontSize: (4 / 100) * screenWidth, color: 'white'}}>Create unique username</Text>
        <TextInput    
        placeholder="Username"
        placeholderTextColor="#a9a9a9"
        style={[styles.text, styles.input]}
        value={username}
        onChangeText={(text) => setUsername(text)}/>
        <TouchableOpacity onPress={handleLogin} style={styles.button} disabled={isLoading}>
          {isLoading ? (
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <ActivityIndicator color="white" />
          <Text style={[styles.text, { color: 'white', marginLeft: 5}]}>Loading...</Text>
          </View>
          ) : (
          <Text style={{fontFamily: 'Open-Sans', color: 'white'}}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151924",
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    margin: 5,
    padding: 5,
    borderRadius: 5,
    borderColor: '#FAAC33',
    color: 'white'
  },
  text: {
    fontFamily: 'Open-Sans'
  },
  loginContainer: {
    marginHorizontal: 20,
    backgroundColor: '#151924',
    borderRadius: 5,
    padding: 20,
    elevation: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    margin: 5,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#FAAC33'
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  tooltipContainer: {
    backgroundColor: "#151924",
    padding: 20,
    borderRadius: 5,
    width: 250,
    alignItems: "center",
  },
  tooltipText: {
    fontFamily: 'Open-Sans',
    fontSize: 13,
    color: '#8E9095',
    textAlign: 'center',
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
  },
});

export default LoginScreen;
