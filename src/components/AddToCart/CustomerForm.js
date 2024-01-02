import React from 'react';
import styled from 'styled-components';

const CustomerForm = ({ formData, setFormData }) => {

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <FormContainer>
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
      {formData.orderType === 'Delivery' ? (
        <>
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
          <InputContainer>
            <input
              type="text"
              id="postCode"
              name="postCode"
              placeholder="Post Code"
              value={formData.postCode}
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
        </>
      ) : (
        <>
          <InputContainer>
            <input
              type="text"
              id="notes"
              name="notes"
              placeholder="Notes"
              value={formData.notes}
              onChange={handleChange}
              required
            />
          </InputContainer>
          <MapsContainer>
          <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4948.712907721025!2d-0.0417565!3d51.6716181!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48761f49f9cd05d7%3A0xf86d6a1bdb3aa431!2sTaco%20Monster!5e0!3m2!1sen!2suk!4v1696160226658!5m2!1sen!2suk" 
           allowfullscreen="" 
           loading="lazy" 
           referrerpolicy="no-referrer-when-downgrade"
           title='TacoMonster location'
           >
          </iframe>
      </MapsContainer>

        </>
      )}
    </FormContainer>
  );
};


const FormContainer = styled.form({
  width: '85%',
  height: '450px', // Adjust this fixed height according to your needs
  borderRadius: 10,
  padding: '30px',
  '@media (max-width: 767px)': {
    padding: '25px',
    maxWidth: '100%',
    height: 'auto',
    margin: 'auto'
  },
  '@media (min-width: 768px) and (max-width: 1024px)': {
    padding: '20px',
    maxWidth: '500px',
    margin: 'auto',
    height: 'auto',
  },
  '@media (min-width: 1025px) and (max-width: 1920px)': {
    padding: '25px',
    maxWidth: '400px',
    margin: 'auto',
    height: 'auto',
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

const MapsContainer = styled.div({
  flex: 1,
  height: '300px',
  iframe: {
    border: 'none',
    width: '100%',
    height: '100%',
  },
  '@media (max-width: 1024px)': {
    height: 'auto',
    iframe: {
      width: '100%',
      height: '300px',
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
