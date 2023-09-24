import React from 'react';
import styled from 'styled-components';

const CustomerForm = ({formData, setFormData}) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <FormContainer >
      <InputContainer>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </InputContainer>
      <InputContainer>
        <input
          type="tel"
          id="contactNumber"
          name="contactNumber"
          placeholder="Contact Number"
          value={formData.contactNumber}
          onChange={handleChange}
          required
        />
      </InputContainer>
      <InputContainer>
        <input
          type="text"
          id="address"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          required
        />
      </InputContainer>
      <NotesInputContainer>
        <textarea
          id="notes"
          name="notes"
          placeholder="Notes"
          value={formData.notes}
          onChange={handleChange}
        />
      </NotesInputContainer>
    </FormContainer>
  );
};

const FormContainer = styled.form({
  width: '85%',
height: '90%',
  borderRadius: 10,

  padding: '30px',
  '@media (max-width: 767px)': {
      padding: '25px',
      maxWidth: '290px',
      margin: 'auto',
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
      padding: '20px',
      maxWidth: '500px',
      margin: 'auto',
  },
  '@media (min-width: 1025px) and (max-width: 1920px)': {
      padding: '25px',
      maxWidth: '400px',
      margin: 'auto',
  },
});

const InputContainer = styled.div({
  marginBottom: '20px',
  
  label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 'bold',

  },
  input: {
      width: '100%',
      padding: '10px',
      border: 'none',
      borderBottom: '1px solid #ccc',
      '@media (max-width: 767px)': {
          padding: '20px 0',
          fontSize: '0.8rem',

      },
      '@media (min-width: 768px) and (max-width: 1024px)': {
        
        padding: '20px 0',
          fontSize: '0.9rem',
      },
     
  },
  textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '5px',
      '@media (max-width: 767px)': {
    
          fontSize: '0.8rem',
          padding: '20px 0',
      },
      '@media (min-width: 768px) and (max-width: 1024px)': {
  
          fontSize: '0.9rem',
          padding: '20px 0',
      },
  }
});

const NotesInputContainer = styled(InputContainer)({
  textarea: {
      height: '250px',
      '@media (max-width: 767px)': {
          height: '150px',
          marginTop: 25
      },
      '@media (min-width: 768px) and (max-width: 1024px)': {
          height: '200px',
      },
  },
  'textarea::placeholder': {
      padding: '0 10px', // Add horizontal padding to the placeholder
  }
});


export default CustomerForm;
