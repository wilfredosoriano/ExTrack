import React from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = ['#FF5733', '#33FF57', '#3366FF', '#075D44', '#FF33FF', '#33FFFF', '#F0F424']; // Example colors

const ColorPickerModal = ({ onSelectColor, isVisible, onClose }) => {
  const handleColorSelection = (color) => {
    AsyncStorage.setItem('selectedColor', color)
    .then(() => {
      onSelectColor(color);
      onClose();
    })
    .catch((error) => {
      console.error('Error saving color to AsyncStorage:', error);
    });
  };

  return (
    <Modal
        transparent
        animationType="fade"
        visible={isVisible}
        onRequestClose={() => onClose(false)}
      >
    <TouchableOpacity style={styles.modalContainer} onPress={onClose} activeOpacity={11}>
    <View style={styles.modalContent}>
      {colors.map((color) => (
        <TouchableOpacity
          key={color}
          style={[styles.colorOption, { backgroundColor: color }]}
          onPress={() => handleColorSelection(color)}
        />
      ))}
       </View>
      </TouchableOpacity>
     
      </Modal>
  );
};

const styles = StyleSheet.create({
  colorOption: {
    width: 40,
    height: 40,
    margin: 5,
    borderRadius: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
      borderRadius: 5,
      padding: 20,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      flexWrap: 'wrap'
  },
});

export default ColorPickerModal;
