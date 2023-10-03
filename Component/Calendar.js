import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';

const CalendarModal = ({ isVisible, onClose }) => {

  const screenWidth = Dimensions.get('window').width;
  const modalWidth = screenWidth * 0.9;

    return (
      <Modal
        transparent
        animationType="fade"
        visible={isVisible}
        onRequestClose={() => onClose(false)}
      >
        <TouchableOpacity style={styles.modalContainer} onPress={onClose} activeOpacity={11}>
        <View style={[styles.modalContent, {width: modalWidth}]}>
        <Calendar
            theme={{
              calendarBackground: 'transparent',
            }}
          />
        </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  const styles = StyleSheet.create({
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
    },
  });
  
  export default CalendarModal;
  
  